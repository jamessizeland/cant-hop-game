import { AiAction } from "hooks/useAiTurn";
import { motion } from "motion/react";
import { DiceResult, PlayerChoice, PlayerColors, PlayerMode } from "types";

const ChoiceContainer: React.FC<{
  dice: DiceResult;
  playerIndex: number;
  mode: PlayerMode;
  endPlayerTurn: (forced: boolean) => Promise<void>;
  makeChoice: (choice: PlayerChoice) => Promise<void>;
  aiAction: AiAction;
  aiTargetChoice: PlayerChoice | null;
}> = ({
  playerIndex,
  mode,
  endPlayerTurn,
  makeChoice,
  dice,
  aiAction,
  aiTargetChoice,
}) => {
  const choicesVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1 + 0.5, // Adds a delay for the choices (delay after dice animation)
        duration: 0.5,
      },
    }),
  };

  // Define highlight style - adjust as needed
  const highlightStyle = {
    borderColor: "blue",
    borderWidth: "4px",
    borderStyle: "solid",
  };
  const croakedHighlightStyle = {
    borderColor: "red",
    borderWidth: "4px",
    borderStyle: "solid",
  };
  return (
    <div
      className="flex flex-row flex-wrap space-x-3 space-y-3 justify-center"
      id="choice-container"
    >
      {dice.choices.length ? (
        dice.choices.map((choice, index) => {
          // Determine if this choice is the one the AI is targeting
          const isAiChoosingThis =
            mode !== "Human" &&
            aiAction === "choose" &&
            aiTargetChoice &&
            choice[0] === aiTargetChoice[0] &&
            choice[1] === aiTargetChoice[1];
          return (
            <motion.button
              key={index} // Key on the motion component
              className="btn btn-outline btn-primary btn-lg shadow justify-center text-2xl font-bold h-16 min-w-16"
              style={{
                borderColor: PlayerColors[playerIndex], // Base border color
                color: PlayerColors[playerIndex],
                ...(isAiChoosingThis ? highlightStyle : {}), // Apply highlight if AI is choosing this
              }}
              type="button"
              disabled={mode !== "Human"}
              onClick={async () => await makeChoice(choice)}
              // Animation options
              custom={index}
              initial="hidden"
              animate="visible"
              variants={choicesVariants}
            >
              {choice[0]} {choice[1] ? `& ${choice[1]}` : ""}
            </motion.button>
          );
        })
      ) : dice.dice.length ? (
        // Display "Croaked!" button if no choices but dice were rolled
        <motion.button
          className="btn btn-outline btn-lg justify-center text-2xl font-bold w-max"
          style={{
            borderColor: PlayerColors[playerIndex],
            color: PlayerColors[playerIndex],
            ...(mode !== "Human" && aiAction === "croaked"
              ? croakedHighlightStyle
              : {}), // Highlight if AI is croaked
          }}
          type="button"
          onClick={async () => await endPlayerTurn(true)}
          // Animation options
          custom={0}
          initial="hidden"
          animate="visible"
          variants={choicesVariants}
        >
          Croaked!
        </motion.button>
      ) : (
        <></>
      )}
    </div>
  );
};

export default ChoiceContainer;
