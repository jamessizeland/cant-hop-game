import { useTour } from "@reactour/tour";
import { MdClose, MdQuestionMark } from "react-icons/md";
import { PlayerColors } from "types";

const TopBar = ({
  playerName,
  playerIndex,
}: {
  playerName: string;
  playerIndex?: number;
}) => {
  const { setIsOpen } = useTour();
  return (
    <div className="w-screen h-10 text-white flex items-center justify-center absolute">
      <button
        type="button"
        className="absolute left-4 text-2xl mt-1"
        onClick={() => setIsOpen(true)}
      >
        <MdQuestionMark />
      </button>
      <h1
        className="text-lg font-bold"
        style={{
          color: PlayerColors[playerIndex ?? 0],
        }}
      >
        {playerName}
      </h1>
      <button
        type="button"
        className="absolute right-4 text-2xl"
        onClick={() => (location.href = "/")}
      >
        <MdClose />
      </button>
    </div>
  );
};

export default TopBar;
