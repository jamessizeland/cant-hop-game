import { useState } from "react";
import Bar from "components/elements/bar";

export function GamePage() {
  const [value, setValue] = useState(0);
  return (
    <div>
      <div className="border border-white">Top Bar</div>
      <div className="border border-white">
        <p>Game</p>
        <Bar value={1} total={2} />
      </div>
      <div className="border border-white">Rolling Area</div>
    </div>
  );
}
