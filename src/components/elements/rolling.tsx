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
      duration: 0.8, // Longer duration for a more dramatic effect
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
      delay: custom * 0.1 + 1, // Adds a delay for the choices (delay after dice animation)
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

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      {!dice.dice.length ? (
        <div className="flex flex-row items-center justify-center space-x-6">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.5 }}
            onClick={updateDice}
            className="btn btn-xl bg-green-400 text-black disabled:opacity-50"
            type="button"
          >
            {hops.length ? "Hop?" : "Hop!"}
          </motion.button>
          {hops.length > 0 ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.5 }}
              onClick={async () => {
                const state = await endTurn();
                setDice({ dice: [], choices: [] });
                setHops([]);
                setGameState(state);
              }}
              className="btn btn-xl bg-green-400 text-black disabled:opacity-50"
              type="button"
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
            custom={index}
            initial="hidden"
            animate="visible"
            variants={diceVariants}
          >
            {number}
          </motion.div>
        ))}
      </div>
      <div className="grid grid-flow-col-dense space-x-4">
        {dice.choices.length ? (
          dice.choices.map((choice, index) => (
            <motion.button
              key={index}
              className="btn btn-outline btn-primary btn-lg shadow flex items-center justify-center text-2xl font-bold w-max"
              custom={index}
              initial="hidden"
              animate="visible"
              variants={choicesVariants}
              type="button"
              onClick={() => makeChoice(choice)}
            >
              {choice[0]} {choice[1] ? `, ${choice[1]}` : ""}
            </motion.button>
          ))
        ) : dice.dice.length ? (
          <motion.button
            className="btn btn-outline btn-primary btn-lg shadow flex items-center justify-center text-2xl font-bold w-max"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={choicesVariants}
            type="button"
            onClick={async () => {
              const state = await endTurn();
              setDice({ dice: [], choices: [] });
              if (state) {
                setGameState(state);
              } else {
                notifyError("Something went wrong ending turn", "endTurnError");
              }
            }}
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
