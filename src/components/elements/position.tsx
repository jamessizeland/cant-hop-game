import LilyPad from "./lilypad";
import { motion } from "motion/react";
import { useMemo } from "react";
import { PlayerColors } from "types";
import { GiFrog2, GiFrogFoot2, GiFrogPrince2 } from "./icons";

/** Details of which players are present at this position */
export type PositionProps = {
  player1?: boolean;
  player2?: boolean;
  player3?: boolean;
  player4?: boolean;
  risker?: boolean;
  currentPlayer: number;
  won: boolean;
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
          repeatType: "reverse",
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
  currentPlayer,
  player1 = false,
  player2 = false,
  player3 = false,
  player4 = false,
  risker = false,
  won = false,
}: PositionProps) => {
  const frogs = [player1, player2, player3, player4]
    .map((frog, index) => {
      return frog ? index : undefined;
    })
    .filter((frog) => frog !== undefined);
  const count = frogs.length;

  const frogPositions1 = [
    {
      top: "50%",
      left: "50%",
      fontSize: "2rem",
    },
  ];
  const frogPositions2 = [
    { top: "40%", left: "30%", fontSize: "1.8rem" },
    { top: "60%", left: "60%", fontSize: "1.8rem" },
  ];
  const frogPositions3 = [
    { top: "30%", left: "50%", fontSize: "1.6rem" },
    { top: "65%", left: "30%", fontSize: "1.6rem" },
    { top: "65%", left: "70%", fontSize: "1.6rem" },
  ];
  const frogPositions4 = [
    { top: "30%", left: "30%", fontSize: "1.2rem" },
    { top: "70%", left: "70%", fontSize: "1.2rem" },
    { top: "30%", left: "70%", fontSize: "1.2rem" },
    { top: "70%", left: "30%", fontSize: "1.2rem" },
  ];

  const frogPositions = useMemo(() => {
    switch (count) {
      case 1:
        return frogPositions1;
      case 2:
        return frogPositions2;
      case 3:
        return frogPositions3;
      case 4:
        return frogPositions4;
      default:
        return [];
    }
  }, [count]);

  return (
    <div>
      {won ? (
        <GiFrogPrince2
          className={`absolute z-20`}
          style={{
            color: PlayerColors[currentPlayer],
            top: "50%",
            left: "50%",
            fontSize: "1.7rem",
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : (
        frogs.map((frog, index) =>
          frog !== undefined ? (
            <GiFrog2
              key={index}
              className={`absolute z-10`}
              style={{
                color: PlayerColors[frog],
                top: frogPositions[index]?.top,
                left: frogPositions[index]?.left,
                fontSize: frogPositions[index]?.fontSize,
                transform: "translate(-50%, -50%)",
              }}
            />
          ) : (
            <></>
          )
        )
      )}
      {risker && (
        <GiFrogFoot2
          className={`absolute z-20`}
          style={{
            color: PlayerColors[currentPlayer],
            top: "50%",
            left: "50%",
            fontSize: "2.2rem",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
};
