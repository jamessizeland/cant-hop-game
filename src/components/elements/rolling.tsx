import { motion } from "motion/react";
import { useState } from "react";
import { chooseColumns, endTurn, rollDice } from "services/ipc";
import { notifyError } from "services/notifications";
import { GameState, PlayerChoice } from "types";

type RollerProps = {
  setGameState: React.Dispatch<React.SetStateAction<GameState | undefined>>;
};

const diceVariants = {
  hidden: { opacity: 0, scale: 0.3, rotate: 45, filter: "blur(5px)" },
  visible: (custom: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    filter: "blur(0px)",
    transition: {
      delay: custom * 0.1, // Delay for staggered effect
      duration: 0.4, // Longer duration for a more dramatic effect
      ease: "easeOut",
    },
  }),
};

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

const DiceRoller = ({ setGameState }: RollerProps) => {
  const [dice, setDice] = useState<{
    dice: number[];
    choices: PlayerChoice[];
  }>({ dice: [], choices: [] });
  const [hops, setHops] = useState<PlayerChoice[]>([]);

  const updateDice = async () => {
    // Clear previous roll if needed.
    setDice({ dice: [], choices: [] });
    // Small delay before showing result (simulate rolling).
    setTimeout(async () => {
      const newDice = await rollDice();
      setDice(newDice);
    }, 100);
  };

  const makeChoice = async (choice: PlayerChoice) => {
    setHops((hops) => {
      const newHops = [...hops, choice];
      console.log("new hops: ", newHops);
      return newHops;
    });
    const state = await chooseColumns(choice);
    setDice({ dice: [], choices: [] });
    if (state) {
      console.log("updating choices");
      setGameState(state);
    } else {
      notifyError("Something went wrong choosing columns", "choiceError");
    }
  };

  const endPlayerTurn = async (forced: boolean) => {
    const state = await endTurn(forced);
    setDice({ dice: [], choices: [] });
    setHops([]);
    setGameState(state);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      {!dice.dice.length ? (
        <div className="flex flex-row items-center justify-center space-x-6">
          <motion.button
            className="btn btn-xl bg-green-400 text-black disabled:opacity-50"
            type="button"
            onClick={async () => await updateDice()}
            // Animation options
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.1 }}
          >
            {hops.length ? "Hop?" : "Hop!"}
          </motion.button>
          {hops.length > 0 ? (
            <motion.button
              className="btn btn-xl bg-green-400 text-black disabled:opacity-50"
              type="button"
              onClick={async () => await endPlayerTurn(false)}
              // Animation options
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.1 }}
            >
              Stop?
            </motion.button>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className="flex space-x-4">
        {dice.dice.map((number, index) => (
          <motion.div
            key={index}
            className="w-16 h-16 bg-white rounded shadow flex items-center justify-center text-2xl font-bold border border-gray-200"
            // Animation options
            custom={index}
            initial="hidden"
            animate="visible"
            variants={diceVariants}
          >
            {number}
          </motion.div>
        ))}
      </div>
      <div className="flex flex-row flex-wrap space-x-4 space-y-4 justify-center">
        {dice.choices.length ? (
          dice.choices.map((choice, index) => (
            <motion.button
              key={index}
              className="btn btn-outline btn-primary btn-lg shadow justify-center text-2xl font-bold h-16 min-w-16"
              type="button"
              onClick={async () => await makeChoice(choice)}
              // Animation options
              custom={index}
              initial="hidden"
              animate="visible"
              variants={choicesVariants}
            >
              {choice[0]} {choice[1] ? `& ${choice[1]}` : ""}
            </motion.button>
          ))
        ) : dice.dice.length ? (
          <motion.button
            className="btn btn-outline btn-primary btn-lg justify-center text-2xl font-bold w-max"
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
    </div>
  );
};

export default DiceRoller;
