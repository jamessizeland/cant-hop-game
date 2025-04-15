import LilyPad from "./lilypad";
import { motion } from "motion/react";
import { useMemo } from "react";
import { GiFrog } from "react-icons/gi";

type PositionProps = {
  className?: string;
  player1?: boolean;
  player2?: boolean;
  player3?: boolean;
  player4?: boolean;
  risker?: boolean;
};

const PositionMarker = (props: PositionProps) => {
  // Generate random initial rotation between -10 and 10 degrees.
  const initialRotation = useMemo(() => Math.random() * 20 - 10, []);
  // Define a random duration for continuous rotation to add natural variation.
  const duration = useMemo(() => 100 + Math.random() * 10, []);

  return (
    <div className="relative w-8 h-auto">
      <FrogPositioning {...props} />
      <motion.div
        initial={{ rotate: initialRotation, scale: 1.0 }}
        animate={{
          rotate: initialRotation + Math.random() > 0.5 ? 360 : -360,
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          duration,
        }}
      >
        <LilyPad className="w-full h-auto" />
      </motion.div>
    </div>
  );
};

export default PositionMarker;

/** Position the frogs within the div.  If there is one frog, place it in the center, if there are more, arrange them. */
const FrogPositioning = ({
  player1,
  player2,
  player3,
  player4,
  risker,
}: PositionProps) => {
  const frogs = [player1, player2, player3, player4, risker].filter(
    Boolean
  ).length;

  return (
    <div>
      <GiFrog className="absolute top-0 left-3 z-10 text-white" />
      <GiFrog className="absolute top-3 left-3 z-10 text-blue-500" />
      <GiFrog className="absolute top-0 left-0 z-10 text-yellow-400" />
      <GiFrog className="absolute top-3 left-0 z-10 text-purple-500" />
      <GiFrog className="absolute top-1 left-1.5 z-20 text-black" />
    </div>
  );
};
