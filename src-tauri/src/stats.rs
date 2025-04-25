/// Track of current game.
pub struct History {}

/// Track of a player's options and decisions.
/// Each turn a player gets to decide to hop or stop
/// They then see the dice result and decide what to select.
pub struct PlayerHistory {
    runs: Vec<usize>,
}
