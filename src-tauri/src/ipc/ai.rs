use std::{
    cmp::Ordering,
    collections::{HashMap, HashSet},
};

use crate::state::{
    AppContext, Choice, Column, ColumnID, DiceResult, PlayerMode, calculate_croak_chance,
};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct AiContinueDecision {
    pub should_continue: bool,
    pub thought: String,
}

#[derive(Clone, Serialize)]
pub struct AiChoiceDecision {
    pub choice: Choice,
    pub thought: String,
}

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
                    // Use >= rather than == so that a double hop which overshoots the
                    // column top (adding 2 to `risked` when only 1 step remained) is
                    // still recognised as topped and triggers an early bank.
                    topped: (banked_distance - column.risked) >= 0,
                }
            })
            .collect()
    }
}

#[tauri::command]
/// Decide bot action, hop or stop
pub fn check_continue(state: tauri::State<AppContext>) -> bool {
    decide_continue(&state).should_continue
}

#[tauri::command]
/// Decide bot action and explain the thinking for the UI.
pub fn check_continue_explained(state: tauri::State<AppContext>) -> AiContinueDecision {
    decide_continue(&state)
}

fn decide_continue(state: &tauri::State<AppContext>) -> AiContinueDecision {
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
        return AiContinueDecision {
            should_continue: false,
            thought: continue_finished_column_thought(player.mode),
        };
    };
    let hops = game_state.hops;
    let croak_chance = calculate_croak_chance(&active_cols, &inactive_cols);

    if active_cols.is_empty() || hops == 0 {
        return AiContinueDecision {
            should_continue: true,
            thought: continue_fresh_turn_thought(player.mode),
        };
    }

    let current_player = game_state.current_player;
    let banked_value: f64 = evaluation
        .iter()
        .map(|col| {
            let urgency = if col.banked_distance <= col.risked + 1 {
                1.8
            } else {
                1.0
            };
            col.risked as f64 * urgency
        })
        .sum();
    let risked_hops: usize = evaluation.iter().map(|col| col.risked).sum();
    let threat = opponent_threat(&game_state.columns, current_player);
    let columns_needed = game_state
        .settings
        .win_cols()
        .saturating_sub(player.won_cols.len());

    let base_risk_threshold = match player.mode {
        PlayerMode::Safe => 0.30,
        PlayerMode::Normal => 0.45,
        PlayerMode::Risky => 0.60,
        PlayerMode::Human => panic!("Shouldn't be called for a human player"),
    };

    let progress_pressure = (banked_value * 0.035).min(0.24);
    let chase_pressure = if threat >= 2 { 0.08 } else { 0.0 };
    let finish_pressure = if columns_needed <= 1 { 0.06 } else { 0.0 };
    let fatigue = (hops.saturating_sub(1) as f64 * 0.035).min(0.16);
    let adjusted_risk_threshold =
        (base_risk_threshold + chase_pressure + finish_pressure - progress_pressure - fatigue)
            .clamp(0.08, 0.82);

    let should_continue = croak_chance < adjusted_risk_threshold;
    println!(
        "bot: {} has decided to {}",
        name,
        if should_continue { "hop" } else { "stop" }
    );
    AiContinueDecision {
        should_continue,
        thought: continue_thought(
            should_continue,
            croak_chance,
            adjusted_risk_threshold,
            risked_hops,
            threat,
            columns_needed,
            player.mode,
        ),
    }
}

#[tauri::command]
/// Decide which column(s) to select
pub fn choose_column(options: DiceResult, state: tauri::State<AppContext>) -> Choice {
    decide_column(options, &state).choice
}

#[tauri::command]
/// Decide which column(s) to select and explain the thinking for the UI.
pub fn choose_column_explained(
    options: DiceResult,
    state: tauri::State<AppContext>,
) -> AiChoiceDecision {
    decide_column(options, &state)
}

fn decide_column(options: DiceResult, state: &tauri::State<AppContext>) -> AiChoiceDecision {
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
    let mut attractiveness: Vec<(f64, Choice, String)> = choices
        .iter()
        .map(|&choice| {
            let value = score_choice(
                choice,
                &columns,
                active_cols,
                player_index,
                &opponent_indices,
            );
            let thought = choice_thought(
                choice,
                &columns,
                active_cols,
                player_index,
                &opponent_indices,
                game_state.settings.players[player_index].mode,
            );
            (value, choice, thought)
        })
        .collect();
    // Sort descending: higher score is better
    attractiveness.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(Ordering::Equal));

    // Choose the best option
    // .first() gives the highest score after descending sort.
    // .unwrap() is safe because options.choices is guaranteed non-empty by game logic.
    let (_, choice, thought) = attractiveness.first().unwrap();
    println!("bot: {} chose {:?}", name, choice);
    AiChoiceDecision {
        choice: *choice,
        thought: thought.clone(),
    }
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
        if active_cols.contains(&self.col) {
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

fn score_choice(
    choice: Choice,
    columns: &[Column; 11],
    active_cols: &HashSet<ColumnID>,
    player_index: usize,
    opponent_indices: &[usize],
) -> f64 {
    let mut score = 0.0;
    let mut simulated_active = active_cols.clone();
    let mut column_counts: HashMap<ColumnID, usize> = HashMap::new();

    for col_id in choice_columns(choice) {
        *column_counts.entry(col_id).or_default() += 1;
    }

    for (col_id, steps_added) in column_counts {
        let Some(column) = columns.get(col_id - 2) else {
            panic!("Invalid column id {}", col_id);
        };
        score +=
            column.rate(&simulated_active, player_index, opponent_indices) * steps_added as f64;
        score += column_context_score(column, steps_added, player_index, opponent_indices);
        simulated_active.insert(col_id);
    }

    let new_columns = simulated_active.len().saturating_sub(active_cols.len());
    if active_cols.len() >= 2 {
        score -= new_columns as f64 * 2.4;
    }

    let unique_cols = choice_columns(choice)
        .into_iter()
        .collect::<HashSet<_>>()
        .len();
    if unique_cols == 1 && choice.1.is_some() {
        score += 3.0;
    }

    score
}

fn column_context_score(
    column: &Column,
    steps_added: usize,
    player_index: usize,
    opponent_indices: &[usize],
) -> f64 {
    let current = column.hops[player_index] + column.risked;
    let after = (current + steps_added).min(column.height);
    let distance_after = column.height.saturating_sub(after);
    let mut score = 0.0;

    if distance_after == 0 {
        score += 14.0;
    } else if distance_after <= 2 {
        score += 5.0 / distance_after as f64;
    }

    if opponent_indices
        .iter()
        .any(|&idx| column.height.saturating_sub(column.hops[idx]) <= 1)
    {
        score += 4.0;
    }

    score
}

fn choice_columns(choice: Choice) -> Vec<ColumnID> {
    match choice {
        (first, Some(second)) => vec![first, second],
        (first, None) => vec![first],
    }
}

fn opponent_threat(columns: &[Column; 11], player_index: usize) -> usize {
    columns
        .iter()
        .filter(|column| column.locked.is_none())
        .filter(|column| {
            column
                .hops
                .iter()
                .enumerate()
                .any(|(idx, &hops)| idx != player_index && column.height.saturating_sub(hops) <= 2)
        })
        .count()
}

fn continue_thought(
    should_continue: bool,
    croak_chance: f64,
    threshold: f64,
    risked_hops: usize,
    threat: usize,
    columns_needed: usize,
    mode: PlayerMode,
) -> String {
    if should_continue {
        if threat >= 2 {
            return match mode {
                PlayerMode::Safe => {
                    "The table is getting crowded. One careful hop to stay in it.".to_string()
                }
                PlayerMode::Normal => "Rivals are close. I need pressure, not manners.".to_string(),
                PlayerMode::Risky => {
                    "They are nearly there. Perfect time to make this uncomfortable.".to_string()
                }
                PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
            };
        }
        if columns_needed <= 1 {
            return match mode {
                PlayerMode::Safe => {
                    "One column could end it. Even I can be brave for that.".to_string()
                }
                PlayerMode::Normal => "A winning lane is open. I am taking the hop.".to_string(),
                PlayerMode::Risky => {
                    "This smells like a finish. No lily-pad loitering.".to_string()
                }
                PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
            };
        }
        if croak_chance > threshold * 0.85 {
            return match mode {
                PlayerMode::Safe => "A little wobbly, but the board still says hop.".to_string(),
                PlayerMode::Normal => "Thin enough to notice, good enough to take.".to_string(),
                PlayerMode::Risky => "That edge has teeth. I like it.".to_string(),
                PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
            };
        }
        return match mode {
            PlayerMode::Safe => "Clean enough. One tidy hop, then we reassess.".to_string(),
            PlayerMode::Normal => "The lanes still look friendly. I hop.".to_string(),
            PlayerMode::Risky => "Plenty of runway. Send it.".to_string(),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    if risked_hops >= 4 {
        return match mode {
            PlayerMode::Safe => "That is enough unbanked progress for one stomach.".to_string(),
            PlayerMode::Normal => {
                "There is real value on the board. I am taking it home.".to_string()
            }
            PlayerMode::Risky => "Even I know when a pile is worth pocketing.".to_string(),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    if croak_chance >= threshold * 1.25 {
        return match mode {
            PlayerMode::Safe => "Nope. The pond is making that face. I bank.".to_string(),
            PlayerMode::Normal => "Too many ways for this to turn ugly. I bank.".to_string(),
            PlayerMode::Risky => "Tempting, but not heroic. Just messy. I bank.".to_string(),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    match mode {
        PlayerMode::Safe => "A modest gain is still a gain. Bank it.".to_string(),
        PlayerMode::Normal => "Good turn. No need to donate it back.".to_string(),
        PlayerMode::Risky => "I could push it, but the board has paid enough.".to_string(),
        PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
    }
}

fn choice_thought(
    choice: Choice,
    columns: &[Column; 11],
    active_cols: &HashSet<ColumnID>,
    player_index: usize,
    opponent_indices: &[usize],
    mode: PlayerMode,
) -> String {
    let cols = choice_columns(choice);

    if cols.iter().any(|&col_id| {
        let column = &columns[col_id - 2];
        column.hops[player_index] + column.risked + 1 >= column.height
    }) {
        return match mode {
            PlayerMode::Safe => format!("Column {} reaches the top. Easy bank material.", cols[0]),
            PlayerMode::Normal => format!("Column {} can top out. That is the line.", cols[0]),
            PlayerMode::Risky => format!("Column {} is begging to be finished.", cols[0]),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    if let Some(col_id) = cols.iter().find(|&&col_id| active_cols.contains(&col_id)) {
        return match mode {
            PlayerMode::Safe => format!("Column {col_id} is already open. Keep it tidy."),
            PlayerMode::Normal => format!("Column {col_id} keeps this run focused."),
            PlayerMode::Risky => format!("Column {col_id} already has momentum. Pile on."),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    if let Some(col_id) = cols.iter().find(|&&col_id| {
        let column = &columns[col_id - 2];
        opponent_indices
            .iter()
            .any(|&idx| column.height.saturating_sub(column.hops[idx]) <= 2)
    }) {
        return match mode {
            PlayerMode::Safe => format!("Column {col_id} also keeps a rival honest."),
            PlayerMode::Normal => format!("Column {col_id} blocks a little and builds a little."),
            PlayerMode::Risky => format!("Column {col_id} is a nice bit of sabotage."),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        };
    }

    match choice {
        (first, Some(second)) if first == second => match mode {
            PlayerMode::Safe => format!("Double {first}. Concentrated progress, fewer loose ends."),
            PlayerMode::Normal => format!("Double {first}. Two hops in one lane will do nicely."),
            PlayerMode::Risky => format!("Double {first}. Now we are talking."),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        },
        (first, Some(second)) => match mode {
            PlayerMode::Safe => format!("{first} and {second} spreads the work without drama."),
            PlayerMode::Normal => format!("{first} and {second} gives this roll the best shape."),
            PlayerMode::Risky => format!("{first} and {second}. More doors, more trouble."),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        },
        (first, None) => match mode {
            PlayerMode::Safe => format!("Column {first} is the neatest single here."),
            PlayerMode::Normal => format!("Column {first} is the useful single."),
            PlayerMode::Risky => format!("Column {first}. Small hop, still counts."),
            PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
        },
    }
}

fn continue_finished_column_thought(mode: PlayerMode) -> String {
    match mode {
        PlayerMode::Safe => "A finished column is not a suggestion. Bank it.".to_string(),
        PlayerMode::Normal => "Column topped. Lock it in before the dice get ideas.".to_string(),
        PlayerMode::Risky => "Top reached. Fine, fine, I will take the shiny thing.".to_string(),
        PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
    }
}

fn continue_fresh_turn_thought(mode: PlayerMode) -> String {
    match mode {
        PlayerMode::Safe => "Fresh turn. First hop is free enough.".to_string(),
        PlayerMode::Normal => "New run, clean board. Let us see the dice.".to_string(),
        PlayerMode::Risky => "Nothing on the line yet. Wake the dice up.".to_string(),
        PlayerMode::Human => unreachable!("AI thoughts are not generated for humans"),
    }
}
