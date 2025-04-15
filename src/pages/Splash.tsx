/** This file defines a simple splash screen component for a web application. */

import { motion } from "motion/react";

export const SplashPage = () => {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <div className="transform flex flex-col items-center justify-center">
        <h1 className="text-9xl font-bold uppercase">Can't</h1>
        <h1 className="text-9xl font-bold uppercase">Hop</h1>
      </div>
      <div className="absolute bottom-1/6">
        <motion.button
          onClick={() => (window.location.href = "/settings")}
          className="btn btn-xl bg-green-400 text-black"
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatType: "loop",
            repeatDelay: 3,
          }}
        >
          New Game
        </motion.button>
      </div>
    </div>
  );
};
