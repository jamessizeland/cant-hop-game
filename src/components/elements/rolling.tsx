import { motion } from "motion/react";
import { useState } from "react";

const diceVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.3, duration: 0.5 },
  }),
};

const DiceRoller: React.FC = () => {
  const [dice, setDice] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);

  const rollDice = () => {
    setRolling(true);
    // Clear previous roll if needed.
    setDice([]);
    // Small delay before showing result (simulate rolling).
    setTimeout(() => {
      // Generate an array of 4 dice with values between 1 and 6.
      const newDice = Array.from(
        { length: 4 },
        () => Math.floor(Math.random() * 6) + 1
      );
      setDice(newDice);
      setRolling(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      <button
        onClick={rollDice}
        disabled={rolling}
        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
      >
        {rolling ? "Rolling..." : "Roll Dice"}
      </button>
      <div className="flex space-x-4">
        {dice.map((number, index) => (
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
    </div>
  );
};

export default DiceRoller;
