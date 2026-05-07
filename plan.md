# Can't Hop Improvement Plan

Last reviewed: 2026-05-07

This is a living plan for small, focused improvements to Can't Hop. The current goal is to keep the game feeling playful and mobile-first while making it smoother on older phones, more robust on awkward screen shapes, and clearer at the end of a game.

## Current Baseline

- `bun run build` passes.
- `cargo test` passes: 8 Rust tests, including 2 end-game statistics tests.
- Vite warns that the main JS chunk is about 500 kB after minification.
- There are currently no frontend tests.
- The Stats page exists but is effectively empty: `src/pages/Stats.tsx`.

## Priority 1: Fix End-Game Statistics

Status: Completed first pass on 2026-05-07.

The current end-game modal shows useful raw ingredients, but the numbers are probably not trustworthy enough to build player-facing language on top of yet.

Findings:

- `History::calculate_summary` uses one shared `total_turns` while calculating all players. Each player's luck is divided by the cumulative game turn count so far, which means later players are scored against earlier players' turns too.
- `record_choice` stores backend column indices, but the UI displays `most_contested_column` directly. That can show `0..10` instead of dice columns `2..12`.
- "Luck" is mathematically interesting but not very legible. A player needs a sentence like "You won, but the pond was generous" more than a decimal.
- `most_contested_column` measures chosen activity normalized by column height. That may be useful, but it is closer to "most travelled" than "most contested" unless opponent overlap is included.
- There are no tests that lock down the history model or summary calculations.

Planned work:

- Done: Add Rust tests for `History::calculate_summary` with deterministic hand-built histories.
- Done: Split global totals from per-player totals so each player's luck is calculated independently.
- Rename or reshape stats so frontend terms match the calculation:
  - `total_rolls` or `total_hops` instead of ambiguous `total_turns`.
  - `busts` instead of `croaked` where it is a count.
  - `banks` instead of `banked` where it is a count.
  - `most_travelled_column` unless true contesting is added.
- Done: Convert column indices back to dice sums before returning or displaying summary values.
- Done: Replace the end-game table with clear player summaries:
  - "Won with steady play"
  - "Won and got away with it"
  - "Lost despite kind rolls"
  - "Pushed too hard"
  - "Played safely, but too slowly"
- Done: Keep the raw numbers available behind a compact details area only if they help debugging or future tuning.

Definition of done:

- End-game copy is based on tested summary fields.
- The winning and losing players each get a short, understandable verdict.
- No stats value shows an internal column index.

## Priority 2: Mobile Layout and Responsiveness

The game screen is very close to the right shape, but several fixed or viewport-based sizes can squeeze the dice row out on short or unusual phones.

Findings:

- `Layout` and `GamePage` use `h-screen` with `overflow-hidden`. Mobile WebViews can report viewport height awkwardly, and hidden overflow means the dice controls can be clipped instead of staying reachable.
- `TopBar` is absolutely positioned, while the board uses `mt-7`; the layout is not reserving explicit space for the top bar.
- The board area does not appear to own a flexible `flex-1` region, so the board and dice roller compete for vertical space.
- Dice are fixed at `w-16 h-16` with horizontal spacing. Four dice plus gaps are usually fine, but not guaranteed once padding, safe areas, or narrow devices are involved.
- The choice row uses `space-x` and `space-y` with `flex-wrap`; Tailwind gap utilities usually behave more predictably for wrapped rows.

Planned work:

- Restructure the game screen into three explicit regions:
  - fixed top bar
  - flexible board area with a known min/max height
  - fixed bottom controls area with safe-area padding
- Replace `h-screen` with modern viewport sizing such as `min-h-dvh` where supported.
- Add `pb-[env(safe-area-inset-bottom)]` or an equivalent safe-area class to bottom controls.
- Give the dice row responsive sizing, for example `clamp(2.6rem, 14vw, 4rem)`.
- Replace `space-x-* space-y-*` on wrapped control rows with `gap-*`.
- Check the smallest target layouts:
  - 320 x 568
  - 360 x 640
  - 390 x 844
  - narrow/tall and wide/short phone aspect ratios

Definition of done:

- Dice and choice buttons remain visible and tappable on the target phone sizes.
- The board scales down gracefully without hiding controls.
- The top bar no longer overlaps the board by layout accident.

## Priority 3: Runtime Performance on Older Phones

Status: First runtime pass completed on 2026-05-07 without reducing animation personality.

The likely bottleneck is not game logic; it is rendering and paint work. The board renders many SVGs and animations, and some animations trigger layout or expensive filters.

Findings:

- The board renders one `PositionMarker` per board step. With the standard column heights, that is a lot of SVG lily pads every render.
- Each lily pad is an inline SVG with its own gradient, mask, and drop-shadow filter. Repeating filters across many nodes is often expensive in mobile WebViews.
- Risk ripples animate `width` and `height` from 10px to 100px. Animating dimensions tends to cause more layout/paint work than animating `transform: scale`.
- Dice animation uses CSS `filter: blur(...)`, which can be expensive on low-end GPUs.
- Route transitions, dice, choice buttons, settings button, and risk markers all use `motion`. The library is nice, but we should be deliberate about where animation is worth the cost.
- Several debug `console.log` calls remain in hot UI paths and AI effects.

Planned work:

- Profile before changing too much:
  - record FPS and long tasks on a low-end Android/WebView target if available
  - compare "idle board", "rolling dice", "choosing columns", and "AI turns"
- Done: Replace dimension-based ripple animation with transform/opacity animation.
- Done: Remove blur from dice animation while keeping the roll lively with scale, rotate, and vertical motion.
- Convert repeated lily pads to a cheaper rendering strategy:
  - static SVG asset reused via `img`, or
  - CSS shape/background, or
  - a single shared SVG symbol/defs approach
- Done: Memoize board pieces where it pays off:
  - `React.memo(PositionMarker)`
  - `React.memo(Bar)` with value-based comparison for column state
  - stable frog-position arrays outside the render path
- Add a simple "Reduced motion" or "Battery saver" setting that disables ripples, route transitions, and nonessential button loops.
- Done: Remove hot-path debug logs from game state updates and AI effects.
- Consider code-splitting the settings/stats/game routes if startup feels slow after runtime jank is addressed.

Definition of done:

- Rolling and selecting feels smooth on an older phone target.
- Risk marker animation no longer causes visible frame drops.
- Reduced motion mode preserves all gameplay clarity.

## Priority 4: Achievements and Ongoing Stats

Status: First pass completed on 2026-05-07.

Achievements will be better if we first fix the single-game stats model. After that, build a small persistent "career" layer separate from in-progress game history.

Initial design:

- Add a persisted `career_stats` store entry alongside current `state` and `history`.
- Done: Add a persisted `career_stats` store entry alongside current `state` and `history`.
- Done: Record completed-game summaries, not every roll forever.
- Track simple lifetime counters first:
  - Done: games played
  - Done: wins by player name
  - Done: total croaks
  - Done: total banks
  - Done: longest successful run
  - Done: columns won most often
  - biggest comeback candidate
- Add achievements that reward recognizable moments:
  - Done: "Three-Hop Hero": bank a run of 3 or more turns.
  - Done: "Still Standing": survive a high-risk roll.
  - Done: "No Splash": win with very few croaks.
  - Done: "Leap of Faith": win after above-average risk.
  - Done: "Close Call": lose despite above-average luck.
- Done: Surface achievements after the game first, then make the Stats page useful once there is enough data.

Design constraints:

- Done: Keep achievements local and lightweight.
- Avoid making the player manage accounts or profiles until there is a clear reason.
- Done: Make achievements explain what happened in normal language, not only badge names.
- Done: Achievements only trigger for human players.
- Done: Achievement records include the player name and the date they were earned.
- Done: Achievement copy is celebratory and gently teases risky play.
- Done: Add access to the career stats page from the new game screen.
- Done: Add a reset achievements action while preserving device-wide career totals.
- Done: Expand the achievement list to at least 20 recognizable moments, including first-to-column achievements, shutouts, last-hop column steals, bookend columns, and unlucky winner versus lucky opponent games.

## Priority 5: Other Small Improvements

- Done: Add app auto-updating from signed GitHub Releases binaries.
- Make `StatsPage` a real page once persistent stats exist.
- Add a compact "why did I croak?" explanation after a bust: show selected columns and why the roll had no legal pair.
- Add haptic feedback on roll, bank, croak, and column win if Tauri/mobile support is straightforward.
- Add a settings toggle for animation intensity.
- Make AI turns easier to follow with a tiny status line instead of console/debug messaging.
- Add tests around choice evaluation edge cases involving locked columns and duplicate dice pairs.
- Align app versions: `package.json` currently reports `0.5.4` while the Rust crate builds as `0.5.5`.

## Suggested Order

1. Fix and test end-game stats.
2. Redesign the game screen layout so dice controls cannot be cut off.
3. Profile and simplify board/risk/dice animations.
4. Add clear end-game verdict copy.
5. Add persistent career stats and the first small achievement set.

## Open Questions

- What is the oldest phone or weakest device we want to support comfortably?
- Should the game prefer lively animation by default with a reduced mode, or a calmer default with optional extra effects?
- Should ongoing stats be tied to player names, device-wide totals, or both?
- Do we want achievements to be purely celebratory, or also gently tease risky play?
