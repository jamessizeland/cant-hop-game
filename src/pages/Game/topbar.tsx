import { MdClose, MdDeveloperMode } from "react-icons/md";
import { PlayerColors } from "types";
import { checkEnv } from "utils";

const TopBar = ({
  playerName,
  setDemo,
  playerIndex,
}: {
  playerName: string;
  setDemo?: React.Dispatch<React.SetStateAction<boolean>>;
  playerIndex?: number;
}) => {
  return (
    <div className="w-screen h-10 text-white flex items-center justify-center absolute">
      {checkEnv("development") && (
        <button
          type="button"
          className="absolute left-5 text-2xl mt-1"
          onClick={() => {
            if (setDemo) setDemo((demo) => !demo);
          }}
        >
          <MdDeveloperMode />
        </button>
      )}
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
        className="absolute right-5 text-2xl"
        onClick={() => (location.href = "/")}
      >
        <MdClose />
      </button>
    </div>
  );
};

export default TopBar;
