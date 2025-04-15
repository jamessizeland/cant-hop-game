import React from "react";

interface BarProps {
  value: number; // 0 to total
  total: number; // in steps
}

const Bar: React.FC<BarProps> = ({ value, total = 12 }) => {
  // make sure value is between 0 and total
  value = Math.min(total, Math.max(0, value));

  return (
    <ul className="steps steps-vertical">
      {Array.from({ length: total }).map((_, index) => {
        const className = index < value ? "step step-primary" : "step";
        return <li key={index} className={className}></li>;
      })}
    </ul>
  );
};

export default Bar;
