import React from "react";
import PositionMarker, { PositionProps } from "./position";

interface BarProps {
  value: number; // 0 to total
  total: number; // in steps
  hops: number[]; // hops for each player
  risked: number; // risked for current player beyond their hops
  currentPlayer: number; // current player
  winner: number | null; // won for player index
}

const Bar: React.FC<BarProps> = ({
  value,
  total,
  hops,
  risked,
  currentPlayer,
  winner,
}) => {
  return (
    <div className="flex flex-col items-center" id={`bar-${value}`}>
      <h1 className="text-white">{value}</h1>
      <ul className="steps steps-vertical overflow-visible">
        {Array.from({ length: total }).map((_, idx) => {
          const index = total - idx; // Reverse the index to match the visual representation
          // if bar has been won, only show the winner on every step
          const players: PositionProps =
            winner !== null
              ? {
                  currentPlayer: winner,
                  won: true,
                }
              : {
                  currentPlayer,
                  player1: hops[0] === index,
                  player2: hops[1] === index,
                  player3: hops[2] === index,
                  player4: hops[3] === index,
                  risker:
                    risked !== 0 &&
                    Math.min(hops[currentPlayer] + risked, total) === index,
                  won: false,
                };
          return (
            <li key={index} className="">
              <PositionMarker {...players} />
            </li>
          );
        })}
      </ul>
      <h1 className="text-white">{value}</h1>
    </div>
  );
};

export default Bar;
