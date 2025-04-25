use std::collections::HashSet;

/// Evaluate the available moves from the four dice.
/// - They must be paired up and cannot be reused.
/// - `selected` is the set of columns already picked this round (0–3 of them).
/// - `unavailable` is the set of columns already won and cannot be chosen again.
/// - You can pick at most 3 *new* columns; columns in `selected` don’t count against that cap.
/// - For each die pairing, if its “double” move (both sums) is legal under the cap and neither column is unavailable,
///   you *must* offer that double (canonicalized as (min, Some(max))) for that pairing and *not* its singles.
/// - Otherwise for that pairing, offer any valid single: already in `selected` or new up to the cap,
///   provided it isn’t unavailable.
pub fn evaluate_moves(
    dice: [usize; 4],
    selected: &HashSet<usize>,
    unavailable: &HashSet<usize>,
) -> HashSet<(usize, Option<usize>)> {
    let mut moves = HashSet::new();
    // how many new columns we can still add:
    let cap = 3usize.saturating_sub(selected.len());

    for &(i, j, k, l) in &[(0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2)] {
        let first = dice[i] + dice[j];
        let second = dice[k] + dice[l];

        // skip if either column is unavailable
        if unavailable.contains(&first) || unavailable.contains(&second) {
            // still consider singles on the available one below
        }

        // Attempt double move: count unique sums
        if !unavailable.contains(&first) && !unavailable.contains(&second) {
            let mut needed = HashSet::new();
            needed.insert(first);
            needed.insert(second);
            // how many of those unique sums are new
            let new_needed = needed
                .iter()
                .filter(|&&col| !selected.contains(&col))
                .count();

            if new_needed <= cap {
                // canonicalize
                let (a, b) = if first <= second {
                    (first, second)
                } else {
                    (second, first)
                };
                moves.insert((a, Some(b)));
                // skip singles for this pairing
                continue;
            }
        }

        // Fallback to singles for this pairing
        for &col in &[first, second] {
            if unavailable.contains(&col) {
                continue;
            }
            if selected.contains(&col) || cap >= 1 {
                moves.insert((col, None));
            }
        }
    }

    moves
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_evaluate_moves_no_selected_columns() {
        let dice = [1, 2, 3, 4];
        let selected = HashSet::new();
        let unavailable = HashSet::new();
        let moves = evaluate_moves(dice, &selected, &unavailable);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(4, Some(6)), (5, Some(5)), (3, Some(7))]
                .iter()
                .cloned()
                .collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_selected_columns() {
        let dice = [1, 2, 3, 4];
        let mut selected = HashSet::new();
        selected.insert(3); // Column 3 is already selected
        let unavailable = HashSet::new();
        let moves = evaluate_moves(dice, &selected, &unavailable);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(4, Some(6)), (5, Some(5)), (3, Some(7))]
                .iter()
                .cloned()
                .collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_full_selected_columns() {
        let dice = [1, 2, 3, 4];
        let mut selected = HashSet::new();
        selected.insert(3);
        selected.insert(7);
        selected.insert(6); // Already selected 3 columns
        let unavailable = HashSet::new();
        let moves = evaluate_moves(dice, &selected, &unavailable);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(6, None), (3, Some(7))].iter().cloned().collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_two_selected_columns() {
        let dice = [2, 4, 3, 5];
        let mut selected = HashSet::new();
        selected.insert(6);
        selected.insert(10);
        let unavailable = HashSet::new();
        let moves = evaluate_moves(dice, &selected, &unavailable);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(6, Some(8)), (7, Some(7)), (5, None), (9, None)]
                .iter()
                .cloned()
                .collect();
        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_unavailable_columns() {
        let dice = [1, 2, 3, 4];
        let selected = HashSet::new();
        let mut unavailable = HashSet::new();
        unavailable.insert(3); // Column 3 is unavailable
        let moves = evaluate_moves(dice, &selected, &unavailable);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(4, Some(6)), (5, Some(5)), (7, None)]
                .iter()
                .cloned()
                .collect();

        assert_eq!(moves, expected_moves);
    }
}
