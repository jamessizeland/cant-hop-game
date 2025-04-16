import { invoke } from "@tauri-apps/api/core";
import { DiceResult, GameState, SettingsState } from "types";
import { notifyError } from "./notifications";

/**
 * Starts the game with the given settings.
 * @param settings - The settings to start the game with.
 * @throws Will throw an error if the game fails to start.
 */
export async function startGame(settings: SettingsState) {
  try {
    await invoke("start_game", { settings });
  } catch (e) {
    notifyError(`Failed to start game: ${e}`, "StartError");
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
  first: number,
  second?: number
): Promise<GameState | undefined> {
  try {
    const state = await invoke<GameState>("choose_columns", { first, second });
    return state;
  } catch (e) {
    notifyError(`Failed to choose columns: ${e}`, "ChooseColumnsError");
  }
}

/** Player has chosen to end their turn. */
export async function endTurn(): Promise<GameState> {
  return await invoke<GameState>("end_turn");
}
