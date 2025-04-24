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
  const initialRotation = useMemo(() => Math.random() * 360, []);

  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      {/* Render LilyPad first so it's naturally behind FrogPositioning */}
      <div
        className="absolute inset-0 z-0" // Position absolutely to fill parent, base z-index
        style={{
          rotate: `${initialRotation}deg`,
        }}
      >
        {/* Ensure LilyPad fills its motion container */}
        <LilyPad className="w-full h-full" />
      </div>

      {/* FrogPositioning is rendered on top of the LilyPad */}
      {/* It needs to be absolutely positioned to overlay correctly */}
      <div className="absolute inset-0">
        <FrogPositioning {...props} />
      </div>
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
  const frogs = useMemo(
    () =>
      [player1, player2, player3, player4]
        .map((frog, index) => {
          return frog ? index : undefined;
        })
        .filter((frog) => frog !== undefined),
    [player1, player2, player3, player4]
  );
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

  // --- Configuration for Concentric Rings ---
  const numberOfRings = 3; // How many rings to show
  const ringDelay = 0.5; // Delay (in seconds) between each ring starting
  const ringDuration = 2; // Duration of each ring's animation
  // --- End Configuration ---

  return (
    <div className="absolute inset-0 w-full h-full">
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
        frogs.map((frogIndex, arrayIndex) => (
          <GiFrog2
            key={frogIndex}
            className={`absolute z-10`}
            style={{
              color: PlayerColors[frogIndex],
              top: frogPositions[arrayIndex]?.top ?? "50%",
              left: frogPositions[arrayIndex]?.left ?? "50%",
              fontSize: frogPositions[arrayIndex]?.fontSize ?? "1.5rem",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))
      )}
      {risker && !won && (
        <>
          {/* Concentric Water Ripple Effect */}
          {Array.from({ length: numberOfRings }).map((_, index) => (
            <motion.div
              key={`ripple-${index}`}
              className="absolute z-15 rounded-full pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                borderWidth: "2px", // Increased border width for definition
                borderColor: "rgba(173, 216, 230, 1)", // Kept color opaque
                width: "60px", // Use base size variable
                height: "60px", // Use base size variable
                transform: "translate(-50%, -50%)", // Center precisely
              }}
              initial={{ width: "5px", height: "5px", opacity: 1 }} // Start invisible (scale 0), slightly reduced initial opacity
              animate={{ width: "80px", height: "80px", opacity: 0 }} // Expand and fade out
              transition={{
                delay: index * ringDelay, // Stagger the start time
                duration: ringDuration,
                ease: "easeOut", // Standard ease out
              }}
            />
          ))}
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
        </>
      )}
    </div>
  );
};
