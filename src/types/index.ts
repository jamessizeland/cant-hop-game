/** Player */
export type Player = {
  /** Player type */
  mode: PlayerMode;
  /** Player's unique ID */
  id: number;
  /** Player's identifying name */
  name: string;
  /** Number of columns the player has won so far */
  won_cols: number[];
};

export type PlayerMode = "Human" | "Safe" | "Normal" | "Risky";

export type Column = {
  /** The dice number of the column */
  col: number;
  /** The height of the column, which is the number of steps */
  height: number;
  /** Number of hops safe for each player */
  hops: [number, number, number, number];
  /** Number of hops risked beyond safe.  Must be +ve int */
  risked: number;
  /** Whether the column has been won */
  locked: number | null;
};

/** 11 columns, one for each possible number on 2D6 */
export type Columns = [
  Column,
  Column,
  Column,
  Column,
  Column,
  Column,
  Column,
  Column,
  Column,
  Column,
  Column
];

/** Settings information */
export type SettingsState = {
  /** Number of players */
  players: Player[];
  /** Number of columns required to win */
  win_cols: number;
};

/** Game state information */
export type GameState = {
  /** Whether the game is in progress, used for resume behaviour */
  in_progress: boolean;
  /** Settings submitted at the start of the game */
  settings: SettingsState;
  /** Index of current player */
  current_player: number;
  /** Hops made in current run by current player */
  hops: number;
  /** 11 columns, one for each possible number on 2D6 */
  columns: Columns;
  /** Info of winning player */
  winner: Player | null;
};

/** Result of rolling the four dice */
export type DiceResult = {
  dice: number[];
  choices: [number, number | undefined][];
};

/** Global Definition of the four player colours */
export const PlayerColors = ["#ffffff", "#f87171", "#99f2e6", "#a78bfa"];

/** Player can choose up to two columns per turn. */
export type PlayerChoice = [number, number | undefined];

export type PlayerStats = {
  /** Longest successful run */
  longest_run: number;
  /** Total turns unsuccessfully ended */
  croaked: number;
  /** Total turns successfully ended */
  banked: number;
  /** Calculated success rate compared to likelihood */
  luck: number;
};

export type StatsSummary = {
  /** Stats of individual players */
  player_stats: PlayerStats[];
  /** Column that had the most total hops, normalized for column height */
  most_contested_column: number;
  total_turns: number;
};
