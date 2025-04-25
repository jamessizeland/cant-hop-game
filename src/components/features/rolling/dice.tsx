import { motion } from "motion/react";
import {
  GiDiceSixFacesFive,
  GiDiceSixFacesFour,
  GiDiceSixFacesOne,
  GiDiceSixFacesSix,
  GiDiceSixFacesThree,
  GiDiceSixFacesTwo,
} from "react-icons/gi";
import { PlayerColors } from "types";

/** Six sided dice */
const D6: React.FC<{
  value: number;
  className?: string;
  style?: React.CSSProperties | undefined;
}> = ({ value, className, style }) => {
  switch (value) {
    case 1:
      return <GiDiceSixFacesOne className={className} style={style} />;
    case 2:
      return <GiDiceSixFacesTwo className={className} style={style} />;
    case 3:
      return <GiDiceSixFacesThree className={className} style={style} />;
    case 4:
      return <GiDiceSixFacesFour className={className} style={style} />;
    case 5:
      return <GiDiceSixFacesFive className={className} style={style} />;
    case 6:
      return <GiDiceSixFacesSix className={className} style={style} />;
    default:
      return null;
  }
};

/** Display the four dice that have been rolled. */
const DiceContainer: React.FC<{ playerIndex: number; dice: number[] }> = ({
  playerIndex,
  dice,
}) => {
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
  return (
    <div className="flex space-x-3" id="dice-container">
      {dice.map((value, index) => (
        <motion.div
          key={index}
          // Animation options
          custom={index}
          initial="hidden"
          animate="visible"
          variants={diceVariants}
        >
          <D6
            value={value}
            className="w-16 h-16 rounded shadow flex items-center justify-center text-2xl font-bold"
            style={{
              color: PlayerColors[playerIndex],
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default DiceContainer;
