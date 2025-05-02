use std::sync::Arc;

use anyhow::Context as _;
use rand::{rngs::StdRng, seq::IndexedRandom as _, SeedableRng};
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt as _};

/// Combine the two lists to generate a random name.
pub fn generate_name(seed: Option<u64>) -> String {
    #[rustfmt::skip]
    const FIRST: [&str; 45] = [
        "Sir", "Jumping", "Ribbit", "Toad", "Frog", "Mighty", "Croak", "Hoppy", "Prince", "King", 
        "General", "Captain", "Lord", "Amphibian", "Sir Webbed", "Professor", "Baron", "The Great", 
        "Webbed", "Splashy", "Webster", "Lilypad", "Swampy", "Lilly", "Bog", "Puddle", "Hop", 
        "Boggy", "Flip", "Jumpy", "Frogger", "Tadpole", "Hopper", "Warty", "Ribbert", "Wartface", 
        "Splash", "Swimmy", "Polly", "Ribbito", "Gribbles", "Croaky", "Bogger", "Tad-a-lot", "Hopperino"
    ];

    #[rustfmt::skip]
    const SECOND: [&str; 66] = [
        "McHop", "Master", "Zilla", "Face", "The Hop", "King", "McSquash", "Hops", "Gator", 
        "Bubbles", "Ruler", "Jumpster", "Froggernaut", "McFrogface", "Hopzilla", "Squasher", 
        "Hopperton", "Whipple", "Wartsworth", "Frogman", "Ribbitus", "Lenny", "McJumps", "Croakson", 
        "Warticus", "Hopkins", "Gilmore", "Hop-a-lot", "Pondmaster", "Ribbit Royale", "Waddle", 
        "Hopperdoodle", "Tadpole", "Croakmaster", "Amphibius", "Swamp", "Croakling", "Ribbit King", 
        "Bubblington", "Frogzilla", "Kicker", "T. Hoppy", "Lilly Pad", "Crispus", "Hoppo", 
        "Pipper", "Hoppy McGee", "Jamboree", "Tadpool", "Croakster", "Ribbit Rambo", "Wartman", 
        "Frogmageddon", "Frogsworth", "Croakopolis", "Toadstool", "Warts", "Bubba", "Polly", 
        "Swampologist", "Hops-a-lot", "Ribber", "Frogspawn", "Jumpy Jack", "Swamp Thing", "Croaklet"
    ];
    let seed = seed.unwrap_or_else(rand::random);
    let mut rng = StdRng::seed_from_u64(seed);

    let part1 = FIRST.choose(&mut rng).unwrap_or(&"");
    let part2 = SECOND.choose(&mut rng).unwrap_or(&"");

    let name = format!("{} {}", part1, part2);
    name
}

pub fn get_store(app: &tauri::AppHandle) -> anyhow::Result<Arc<Store<Wry>>> {
    const STORE: &str = "store.json";
    app.store(STORE)
        .context("failed to open store when saving game state.")
}
