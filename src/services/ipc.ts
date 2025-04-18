import { invoke } from "@tauri-apps/api/core";
import { DiceResult, GameState, PlayerChoice, SettingsState } from "types";
import { notifyError } from "./notifications";

/**
 * Starts the game with the given settings.
 * @param settings - The settings to start the game with.
 * @throws Will throw an error if the game fails to start.
 */
export async function startGame(settings: SettingsState): Promise<boolean> {
  try {
    await invoke("start_game", { settings });
    return true;
  } catch (e) {
    notifyError(`Failed to start game: ${e}`, "StartError");
    return false;
  }
}

/**
 * Rolls the dice and returns the result.
 * @returns A promise that resolves to the result of the dice roll.
 */
export async function rollDice(): Promise<DiceResult> {
  return await invoke<DiceResult>("roll_dice");
}

/**
 * Chooses the columns for the game.
 * @param first - The first column to choose.
 * @param second - The second column to choose (optional).
 * @throws Will throw an error if the columns fail to be chosen.
 */
export async function chooseColumns(
  choice: PlayerChoice
): Promise<GameState | undefined> {
  // convert number to index, as the backend uses 0-based indexing and the user is
  // choosing a 2d6 number, so we need to subtract 2 from the number.
  const first = choice[0] - 2;
  const second = choice[1] ? choice[1] - 2 : undefined;
  try {
    return await invoke<GameState>("choose_columns", { first, second });
  } catch (e) {
    notifyError(`Failed to choose columns: ${e}`, "ChooseColumnsError");
  }
}

/** Player has chosen to end their turn. */
export async function endTurn(): Promise<GameState> {
  return await invoke<GameState>("end_turn");
}

/** Return the current game state. */
export async function getGameState(): Promise<GameState> {
  return await invoke<GameState>("get_game_state");
}

/** Generate a random name, can be seeded for reproducibility.
 * @param seed - Optional seed for random name generation.
 * @returns A promise that resolves to the generated name.
 */
export async function getName(seed?: number): Promise<string> {
  return await invoke<string>("get_name", { seed });
}
