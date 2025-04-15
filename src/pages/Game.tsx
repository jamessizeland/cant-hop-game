import Bar from "components/elements/bar";
import { useState } from "react";
import Dice from "react-dice-roll";

export function GamePage() {
  const [value, setValue] = useState(0);
  return (
    <div>
      <p>Can't Stop</p>
      <Bar value={value} total={12} />
      <Dice onRoll={(value) => setValue((last) => last + value)} />
    </div>
  );
}
