import LilyPad from "./lilypad";
import { motion } from "motion/react";
import { useMemo } from "react";
import { GiFrog } from "react-icons/gi";
import { PlayerColors } from "types";

/** Details of which players are present at this position */
export type PositionProps = {
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
  player1 = false,
  player2 = false,
  player3 = false,
  player4 = false,
  risker = false,
}: PositionProps) => {
  const frogs = [player1, player2, player3, player4];
  const frogPositions = [
    { top: "30%", left: "30%" },
    { top: "70%", left: "70%" },
    { top: "30%", left: "70%" },
    { top: "70%", left: "30%" },
  ];

  return (
    <div>
      {frogs.map(
        (frog, index) =>
          frog && (
            <GiFrog
              key={index}
              className={`absolute z-10 text-${PlayerColors[index]}`}
              style={{
                top: frogPositions[index]?.top,
                left: frogPositions[index]?.left,
                transform: "translate(-50%, -50%)",
              }}
            />
          )
      )}
      {risker && (
        <GiFrog
          className={`absolute z-20 text-black`}
          style={{
            top: "50%",
            left: "50%",
            fontSize: "1.7rem",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
};
