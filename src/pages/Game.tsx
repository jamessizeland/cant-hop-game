import { useState } from "react";
import Bar from "components/elements/bar";
import DiceRoller from "components/elements/rolling";

export function GamePage() {
  const [value, setValue] = useState(0);
  return (
    <div className="flex flex-col items-center h-screen w-screen">
      <div className="h-10 w-screen">Top Bar</div>
      <div
        className=" w-screen flex items-center justify-center flex-col"
        style={{
          // borderRadius: "45%",
          background:
            "radial-gradient(circle, rgba(49,130,206,1) 50%, rgba(49,130,206,0) 90%)",
        }}
      >
        <div className="flex items-center w-screen justify-center">
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
      <DiceRoller />
    </div>
  );
}
