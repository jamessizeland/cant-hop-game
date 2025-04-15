import { useState } from "react";
import Bar from "components/elements/bar";

export function GamePage() {
  const [value, setValue] = useState(0);
  return (
    <div>
      <div className="border border-white">Top Bar</div>
      <div className="border border-white">
        <h1>Game</h1>
        <div className="flex items-center">
          <Bar value={2} total={3} />
          <Bar value={3} total={5} />
          <Bar value={4} total={7} />
          <Bar value={5} total={9} />
          <Bar value={6} total={11} />
          <Bar value={7} total={13} />
          <Bar value={8} total={11} />
          <Bar value={9} total={9} />
          <Bar value={10} total={7} />
          <Bar value={11} total={5} />
          <Bar value={12} total={3} />
        </div>
      </div>
      <div className="border border-white">Rolling Area</div>
    </div>
  );
}
