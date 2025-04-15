import Bar from "components/elements/bar";
import DiceRoller from "components/elements/rolling";
import { DemoColumns } from "types";

export function GamePage() {
  const currentPlayer = 0;
  return (
    <div className="flex flex-col items-center h-screen w-screen">
      <div className="h-10 w-screen">Top Bar</div>
      <div
        className=" w-screen flex items-center justify-center flex-col"
        style={{
          background:
            "radial-gradient(circle, rgba(49,130,206,1) 50%, rgba(49,130,206,0) 90%)",
        }}
      >
        <div className="flex items-center w-screen justify-center">
          {DemoColumns.map((column, index: number) => (
            <Bar
              key={index}
              value={column.col}
              total={column.height}
              hops={column.hops}
              risked={column.risked}
              currentPlayer={currentPlayer}
            />
          ))}
        </div>
      </div>
      <DiceRoller />
    </div>
  );
}
