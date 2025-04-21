import Bar from "components/elements/bar";
import React from "react";
import { GameState } from "types";
import { DemoColumns } from "types/placeholders";

type BoardProps = {
  gameState: GameState;
  demo?: boolean;
};

const GameBoard: React.FC<BoardProps> = ({ gameState, demo }) => {
  return (
    <div className="flex items-center w-screen justify-center">
      {(demo ? DemoColumns : gameState.columns).map((column, index: number) => (
        <Bar
          key={index}
          value={column.col}
          total={column.height}
          hops={column.hops}
          risked={column.risked}
          currentPlayer={gameState?.current_player}
          winner={column.locked}
        />
      ))}
    </div>
  );
};

export default GameBoard;
