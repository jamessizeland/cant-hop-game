import { AiAction } from "hooks/useAiTurn";
import { motion } from "motion/react";
import { PlayerColors, PlayerMode } from "types";

const TurnStartContainer: React.FC<{
  playerIndex: number;
  mode: PlayerMode;
  hops: number;
  aiAction: AiAction;
  updateDice: () => Promise<void>;
  endPlayerRun: (forced: boolean) => Promise<void>;
}> = ({ playerIndex, mode, hops, aiAction, updateDice, endPlayerRun }) => {
  // Define highlight style - adjust border color/width or use Tailwind classes (e.g., ring-4 ring-blue-500)
  const highlightStyle = {
    borderColor: PlayerColors[playerIndex],
    borderWidth: "4px",
    borderStyle: "solid",
  };

  return (
    <div
      className="flex flex-row items-center justify-center space-x-6"
      id="turn-start-container"
    >
      <motion.button
        id="hop-button"
        type="button"
        disabled={mode !== "Human"}
        onClick={async () => await updateDice()}
        // Animation options
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 5,
          delay: 8,
        }}
        // Apply base classes and conditional highlight style
        className="btn btn-xl text-black disabled:opacity-80 bg-green-400"
        style={mode !== "Human" && aiAction === "hop" ? highlightStyle : {}}
      >
        Hop
      </motion.button>
      {hops > 0 && (
        <motion.button
          id="stop-button"
          type="button"
          onClick={async () => await endPlayerRun(false)}
          disabled={mode !== "Human"}
          // Animation options
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ duration: 0.1 }}
          // Apply base classes and conditional highlight style
          className="btn btn-xl text-black disabled:opacity-80 bg-green-400"
          style={mode !== "Human" && aiAction === "stop" ? highlightStyle : {}}
        >
          Stop
        </motion.button>
      )}
    </div>
  );
};

export default TurnStartContainer;
