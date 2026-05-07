import { AiAction } from "hooks/useAiTurn";
import { motion } from "motion/react";
import { PlayerColors, PlayerMode } from "types";

function transparentHex(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

function AiButtonHighlight({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-0 rounded-[inherit]"
        style={{
          backgroundColor: transparentHex(color, "24"),
        }}
      />
      <span
        className="absolute inset-[3px] rounded-[inherit]"
        style={{
          boxShadow: `inset 0 0 0 2px ${color}`,
        }}
      />
    </span>
  );
}

const TurnStartContainer: React.FC<{
  playerIndex: number;
  mode: PlayerMode;
  hops: number;
  aiAction: AiAction;
  updateDice: () => Promise<void>;
  endPlayerRun: (forced: boolean) => Promise<void>;
}> = ({ playerIndex, mode, hops, aiAction, updateDice, endPlayerRun }) => {
  const highlightColor = PlayerColors[playerIndex];

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
        className="btn btn-xl relative overflow-hidden text-black disabled:opacity-80 bg-green-400"
      >
        {mode !== "Human" && aiAction === "hop" && (
          <AiButtonHighlight color={highlightColor} />
        )}
        <span className="relative z-10">Hop</span>
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
          className="btn btn-xl relative overflow-hidden text-black disabled:opacity-80 bg-green-400"
        >
          {mode !== "Human" && aiAction === "stop" && (
            <AiButtonHighlight color={highlightColor} />
          )}
          <span className="relative z-10">Stop</span>
        </motion.button>
      )}
    </div>
  );
};

export default TurnStartContainer;
