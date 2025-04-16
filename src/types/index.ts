/** Player */
export type Player = {
  /** Player type */
  mode: "human" | "safe" | "normal" | "risky";
  id: string;
  name: string;
};

export type Column = {
  /** The dice number of the column */
  col: number;
  /** The height of the column, which is the number of steps */
  height: number;
  /** Number of hops safe for each player */
  hops: [number, number, number, number];
  /** Number of hops risked beyond safe.  Must be +ve int */
  risked: number;
};

/** Settings information */
export type SettingsState = {
  /** Number of players */
  players: Player[];
  /** Number of columns required to win */
  winCols: number;
};

/** Game state information */
export type GameState = {
  settings: SettingsState;
  currentPlayer: number;
  columns: [
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
  winner: number | null;
};

export type DiceResult = [number, number, number, number];

/** Global Definition of the four player colours */
export const PlayerColors = ["white", "red-500", "yellow-400", "purple-500"];

export const DemoColumns: Column[] = [
  {
    col: 2,
    height: 3,
    hops: [0, 1, 2, 1],
    risked: 0,
  },
  {
    col: 3,
    height: 5,
    hops: [4, 0, 2, 2],
    risked: 0,
  },
  {
    col: 4,
    height: 7,
    hops: [0, 2, 3, 1],
    risked: 0,
  },
  {
    col: 5,
    height: 9,
    hops: [0, 1, 2, 3],
    risked: 0,
  },
  {
    col: 6,
    height: 11,
    hops: [5, 6, 7, 8],
    risked: 1,
  },
  {
    col: 7,
    height: 13,
    hops: [0, 1, 2, 3],
    risked: 2,
  },
  {
    col: 8,
    height: 11,
    hops: [0, 1, 2, 3],
    risked: 3,
  },
  {
    col: 9,
    height: 9,
    hops: [0, 1, 2, 3],
    risked: 1,
  },
  {
    col: 10,
    height: 7,
    hops: [0, 1, 2, 3],
    risked: 0,
  },
  {
    col: 11,
    height: 5,
    hops: [2, 1, 2, 3],
    risked: 1,
  },
  {
    col: 12,
    height: 3,
    hops: [2, 1, 2, 2],
    risked: 0,
  },
];
