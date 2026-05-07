import LilyPad from "./lilypad";
import { AnimatePresence, motion } from "motion/react";
import { memo, useMemo } from "react";
import { PlayerColors } from "@/types";
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

const frogPositions = [
  [],
  [
    {
      top: "50%",
      left: "50%",
      fontSize: "clamp(1rem, 9vw, 2rem)",
    },
  ],
  [
    { top: "40%", left: "30%", fontSize: "clamp(0.9rem, 8vw, 1.8rem)" },
    { top: "60%", left: "60%", fontSize: "clamp(0.9rem, 8vw, 1.8rem)" },
  ],
  [
    { top: "30%", left: "50%", fontSize: "clamp(0.8rem, 7vw, 1.6rem)" },
    { top: "65%", left: "30%", fontSize: "clamp(0.8rem, 7vw, 1.6rem)" },
    { top: "65%", left: "70%", fontSize: "clamp(0.8rem, 7vw, 1.6rem)" },
  ],
  [
    { top: "30%", left: "30%", fontSize: "1.3rem" },
    { top: "70%", left: "70%", fontSize: "1.3rem" },
    { top: "30%", left: "70%", fontSize: "1.3rem" },
    { top: "70%", left: "30%", fontSize: "1.3rem" },
  ],
];

const numberOfRings = 3;
const ringDelay = 0.3;
const ringDuration = 1;

const PositionMarker = (props: PositionProps) => {
  const initialRotation = useMemo(() => Math.random() * 360, []);

  return (
    <div className="relative w-[9vw] h-[9vw] max-w-8 max-h-8 flex items-center justify-center">
      <div
        className="absolute inset-0 z-0"
        style={{
          rotate: `${initialRotation}deg`,
        }}
      >
        <LilyPad className="w-full h-full" />
      </div>
      <div className="absolute inset-0">
        <FrogPositioning {...props} />
      </div>
    </div>
  );
};

function samePositionProps(prev: PositionProps, next: PositionProps) {
  return (
    prev.currentPlayer === next.currentPlayer &&
    prev.player1 === next.player1 &&
    prev.player2 === next.player2 &&
    prev.player3 === next.player3 &&
    prev.player4 === next.player4 &&
    prev.risker === next.risker &&
    prev.won === next.won
  );
}

export default memo(PositionMarker, samePositionProps);

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
        .filter((frog): frog is number => frog !== undefined),
    [player1, player2, player3, player4]
  );
  const count = frogs.length;
  const positions = frogPositions[count] ?? [];

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
              top: positions[arrayIndex]?.top ?? "50%",
              left: positions[arrayIndex]?.left ?? "50%",
              fontSize: positions[arrayIndex]?.fontSize ?? "1.5rem",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))
      )}
      <AnimatePresence>
        {risker && !won && (
          <>
            {/* Concentric Water Ripple Effect */}
            {Array.from({ length: numberOfRings }).map((_, index) => (
              <motion.div
                key={`ripple-${index}`}
                className="absolute -z-10 rounded-full pointer-events-none"
                style={{
                  top: "50%",
                  left: "50%",
                  borderWidth: "2px",
                  borderColor: "rgba(17, 216, 230, 0.8)",
                  width: "60px",
                  height: "60px",
                }}
                initial={{
                  x: "-50%",
                  y: "-50%",
                  scale: 0.2,
                  opacity: 1 - index * 0.4,
                }}
                animate={{ x: "-50%", y: "-50%", scale: 1.8, opacity: 0 }}
                transition={{
                  delay: index * ringDelay,
                  duration: ringDuration,
                  ease: "easeOut",
                }}
              />
            ))}
            <motion.div
              key="frog-foot"
              className="absolute z-20"
              style={{
                top: "50%",
                left: "50%",
              }}
              initial={{ y: "-70%", x: "-50%", scale: 0.5, opacity: 0 }}
              animate={{
                y: "-50%",
                x: "-50%",
                scale: 1,
                opacity: 1,
                transition: { duration: 0.1, ease: "easeOut" },
              }}
              exit={{
                y: "-100%",
                scale: 0.3,
                opacity: 0,
                transition: { duration: 0.1, ease: "easeIn" },
              }}
            >
              <GiFrogFoot2
                style={{
                  color: PlayerColors[currentPlayer],
                  fontSize: "clamp(1rem, 9vw, 2.2rem)",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
