/** Player */
export type Player = {
  /** Player type */
  mode: "human" | "safe" | "normal" | "risky";
  id: string;
  name: string;
};

export type Column = {
  /** Total height of the column */
  height: number;
  /** Safely reached spot.  Must be +ve int */
  safe: number;
  /** Number of hops risked beyond safe.  Must be +ve int */
  risked: number;
};

/** 12 columns, representing the position in each */
export type Columns = Column[];

/** Settings information */
export type SettingsState = {
  /** Number of players */
  players: Player[];
  /** Number of columns required to win */
  winCols: number;
};
