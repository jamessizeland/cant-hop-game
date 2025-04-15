import React from "react";
import PositionMarker from "./position";

interface BarProps {
  value: number; // 0 to total
  total: number; // in steps
}

const Bar: React.FC<BarProps> = ({ value, total = 12 }) => {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-black">{value}</h1>
      <ul className="steps steps-vertical">
        {Array.from({ length: total }).map((_, index) => {
          return (
            <li key={index} className="flex justify-center items-center">
              <PositionMarker />
            </li>
          );
        })}
      </ul>
      <h1 className="text-black">{value}</h1>
    </div>
  );
};

export default Bar;
