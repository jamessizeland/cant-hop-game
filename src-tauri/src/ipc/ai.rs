use std::{cmp::Ordering, collections::HashSet};

use crate::state::{
    calculate_croak_chance, AppContext, Choice, Column, ColumnID, DiceResult, PlayerMode,
};

#[derive(Eq, Hash, PartialEq, Debug, Clone, Copy)]
struct EvaluateColumn {
    /// How many hops to the top
    banked_distance: usize,
    /// How many of those hops are not secure
    risked: usize,
    /// Has reached the top but not banked yet
    topped: bool,
    // /// Closest Opponent
    // opponent_distance: usize,
}

impl EvaluateColumn {
    fn evaluate(
        columns: [Column; 11],
        active_cols: &HashSet<ColumnID>,
        player_index: usize,
    ) -> HashSet<Self> {
        active_cols
            .iter()
            .map(|col| {
                let index = *col - 2; // convert from 2d6 to index
                let Some(column) = columns.get(index) else {
                    panic!("Invalid column index {}", col);
                };
                let banked_distance = column.height - column.hops[player_index];
                Self {
                    banked_distance,
                    risked: column.risked,
                    topped: banked_distance - column.risked <= 0,
                }
            })
            .collect()
    }
}

#[tauri::command]
/// Decide bot action, hop or stop
pub fn check_continue(state: tauri::State<AppContext>) -> bool {
    let game_state = state.game.lock().unwrap();
    let player = &game_state.settings.players[game_state.current_player];
    let name = &player.name;
    println!("bot: {} is thinking...", name);
    let active_cols = game_state.get_selected();
    let inactive_cols = game_state.get_unavailable();
    // croak chance 0.0 - 1.0
    let evaluation =
        EvaluateColumn::evaluate(game_state.columns, &active_cols, game_state.current_player);
    if evaluation.iter().any(|col| col.topped) {
        return false; // bank this progress
    };
    let hops = game_state.hops;
    // Define how much the threshold decreases per hop made in the current turn
    const RISK_AVERSION_PER_HOP: f64 = 0.05; // e.g., 5% more cautious per hop
                                             // Define a minimum threshold to prevent it from becoming zero or negative too easily
    const MINIMUM_RISK_THRESHOLD: f64 = 0.05; // e.g., always willing to take at least a 5% risk

    let croak_chance = calculate_croak_chance(&active_cols, &inactive_cols);
    let base_risk_threshold = match player.mode {
        // Safe bot avoids risks. Stops if bust chance is relatively low.
        PlayerMode::Safe => 0.35, // Base threshold for Safe bot
        // Normal bot takes calculated risks. Standard threshold.
        PlayerMode::Normal => 0.50, // Base threshold for Normal bot
        // Risky bot pushes their luck. High tolerance for busting.
        PlayerMode::Risky => 0.65, // Base threshold for Risky bot
        PlayerMode::Human => panic!("Shouldn't be called for a human player"),
    };

    // Adjust threshold based on hops: subtract aversion factor for each hop made
    let adjusted_risk_threshold =
        (base_risk_threshold - (hops as f64 * RISK_AVERSION_PER_HOP)).max(MINIMUM_RISK_THRESHOLD);

    let should_continue = croak_chance < adjusted_risk_threshold;
    println!(
        "bot: {} has decided to {}",
        name,
        if should_continue { "hop" } else { "stop" }
    );
    should_continue
}

#[tauri::command]
/// Decide which column(s) to select
pub fn choose_column(options: DiceResult, state: tauri::State<AppContext>) -> Choice {
    let game_state = state.game.lock().unwrap();
    let player_index = game_state.current_player;
    let name = &game_state.settings.players[player_index].name;
    println!("bot: {} is choosing a column...", name);
    // Get indices of all other players
    let opponent_indices: Vec<usize> = (0..game_state.settings.players.len())
        .filter(|&idx| idx != player_index)
        .collect();
    let choices: HashSet<(usize, Option<usize>)> = options.choices;
    let active_cols = &game_state.get_selected();
    let columns = game_state.columns;
    let mut attractiveness: Vec<(f64, Choice)> = choices
        .iter()
        .map(|&choice| {
            // convert number to index, as the backend uses 0-based indexing and the user is
            // choosing a 2d6 number, so we need to subtract 2 from the number.
            let indexed_choice = (choice.0 - 2, choice.1.map(|x| x - 2));
            let value = match indexed_choice {
                (first, None) => {
                    let Some(column) = columns.get(first) else {
                        panic!("Invalid index {}", first);
                    };
                    column.rate(active_cols, player_index, &opponent_indices)
                }
                (first, Some(second)) => {
                    // Sum the attractiveness of both columns for pairs
                    let Some(column1) = columns.get(first) else {
                        panic!("Invalid index {}", first);
                    };
                    let Some(column2) = columns.get(second) else {
                        panic!("Invalid index {}", second);
                    };
                    let rating = column1.rate(active_cols, player_index, &opponent_indices)
                        + column2.rate(active_cols, player_index, &opponent_indices);
                    match first == second {
                        // weight higher if the two values are the same.
                        true => rating * 1.5,
                        false => rating,
                    }
                }
            };
            (value, choice)
        })
        .collect();
    // Sort descending: higher score is better
    attractiveness.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(Ordering::Equal));

    // Choose the best option
    // .first() gives the highest score after descending sort.
    // .unwrap() is safe because options.choices is guaranteed non-empty by game logic.
    let choice = attractiveness.first().unwrap().1;
    println!("bot: {} chose {:?}", name, choice);
    choice
}

impl Column {
    /// Evaluate the attractiveness of choosing this column on an arbitrary scale. Higher is better.
    ///
    /// # Arguments
    /// * `active_cols` - Set of column IDs already selected in the current turn.
    /// * `player_index` - Index of the current AI player.
    /// * `opponent_indices` - Indices of all opponent players.
    fn rate(
        &self,
        active_cols: &HashSet<ColumnID>,
        player_index: usize,
        opponent_indices: &[usize],
    ) -> f64 {
        let mut score = 0.0;

        // --- Weights for different factors (these can be tuned) ---
        const WEIGHT_ACTIVE: f64 = 5.0; // Bonus for using an already active column if < 3 are active
        const WEIGHT_PROGRESS: f64 = 1.0; // Reward for progress already made
        const WEIGHT_DISTANCE: f64 = 2.0; // Reward for being closer to the top
        const WEIGHT_OPPONENT: f64 = 1.5; // Reward for blocking opponents who are close
        const WEIGHT_PROBABILITY: f64 = 0.5; // Small reward for columns statistically easier to roll

        // --- Calculations ---

        // 1. Active Column Bonus: Prioritize using columns already started this turn
        //    if we haven't picked 3 unique columns yet.
        if active_cols.len() < 3 && active_cols.contains(&self.col) {
            score += WEIGHT_ACTIVE;
        }

        let current_hops = self.hops[player_index];
        // Calculate state *after* the potential move (adding one hop).
        let potential_hops = current_hops + 1;
        let potential_distance = self.height.saturating_sub(potential_hops);

        // 3. Progress Score: Reward columns where we've already invested hops.
        score += WEIGHT_PROGRESS * (current_hops as f64);

        // 4. Distance Score: Reward columns closer to the top. Higher score for smaller potential_distance.
        //    Add 1.0 to denominator to avoid division by zero if topped (potential_distance is 0).
        //    Scale by height to give slightly more weight to finishing taller columns.
        score += WEIGHT_DISTANCE * (self.height as f64 / (potential_distance as f64 + 1.0));

        // 5. Opponent Blocking Score: Consider blocking opponents close to winning this column.
        let max_opponent_hops = opponent_indices
            .iter()
            .map(|&idx| self.hops[idx])
            .max()
            .unwrap_or(0); // Find the most advanced opponent on this column

        if max_opponent_hops > 0 {
            let opponent_distance = self.height.saturating_sub(max_opponent_hops);
            // Add score, weighted more heavily if the opponent is closer (smaller opponent_distance).
            score += WEIGHT_OPPONENT * (self.height as f64 / (opponent_distance as f64 + 1.0));
        }

        // 6. Column Probability Score: Give a slight edge to columns corresponding to more probable dice rolls.
        //    Maps column ID (0-10) to dice sum probability factor (1-6).
        //    IDs 0/10 (sum 2/12) -> factor 1; ID 5 (sum 7) -> factor 6.
        let probability_factor = 6.0 - (5.0 - self.col as f64).abs(); // Simple way to get 1..6..1 pattern
        score += WEIGHT_PROBABILITY * probability_factor;

        // Ensure score is non-negative
        score.max(0.0)
    }
}
