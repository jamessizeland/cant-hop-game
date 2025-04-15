import React from "react";
import LilyPad from "./lilypad";
import { motion } from "motion/react";

interface BarProps {
  value: number; // 0 to total
  total: number; // in steps
}

const Bar: React.FC<BarProps> = ({ value, total = 12 }) => {
  return (
    <div className="flex flex-col items-center">
      <h1>{value}</h1>
      <ul className="steps steps-vertical">
        {Array.from({ length: total }).map((_, index) => {
          // Generate random initial rotation between -10 and 10 degrees.
          const initialRotation = Math.random() * 20 - 10;
          // Generate random scale between 0.9 and 1.1.
          const randomScale = 0.9 + Math.random() * 0.2;
          // Define a random duration for continuous rotation to add natural variation.
          const duration = 150 + Math.random() * 10;

          return (
            <li key={index} className="flex justify-center items-center">
              <motion.div
                initial={{ rotate: initialRotation, scale: randomScale }}
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
                <LilyPad className="w-13 h-13" />
              </motion.div>
            </li>
          );
        })}
      </ul>
      <h1>{value}</h1>
    </div>
  );
};

export default Bar;
