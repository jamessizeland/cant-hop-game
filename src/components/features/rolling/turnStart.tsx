import { motion } from "motion/react";
import { PlayerMode } from "types";

const TurnStartContainer: React.FC<{
  mode: PlayerMode;
  hops: number;
  updateDice: () => Promise<void>;
  endPlayerRun: (forced: boolean) => Promise<void>;
}> = ({ mode, hops, updateDice, endPlayerRun }) => {
  return (
    <div
      className="flex flex-row items-center justify-center space-x-6"
      id="turn-start-container"
    >
      <motion.button
        id="hop-button"
        className="btn btn-xl text-black disabled:opacity-50 bg-green-400"
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
      >
        Hop
      </motion.button>
      {hops > 0 && (
        <motion.button
          id="stop-button"
          className="btn btn-xl text-black disabled:opacity-50 bg-green-400"
          type="button"
          onClick={async () => await endPlayerRun(false)}
          disabled={mode !== "Human"}
          // Animation options
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ duration: 0.1 }}
        >
          Stop
        </motion.button>
      )}
    </div>
  );
};

export default TurnStartContainer;
