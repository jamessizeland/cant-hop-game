/** This file defines a simple splash screen component for a web application. */

import Footer from "components/Layout/footer";
import { motion } from "motion/react";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      // Stagger the appearance of each child by 0.3 seconds.
      staggerChildren: 0.8,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export const SplashPage = () => {
  return (
    <motion.div
      className="flex items-center justify-center h-screen w-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="transform flex flex-col items-center justify-center">
        <motion.h1
          variants={fadeUpVariants}
          className="text-8xl font-bold uppercase"
        >
          Can't
        </motion.h1>
        <motion.h1
          variants={fadeUpVariants}
          className="text-8xl font-bold uppercase"
        >
          Hop
        </motion.h1>
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
      <Footer />
    </motion.div>
  );
};
