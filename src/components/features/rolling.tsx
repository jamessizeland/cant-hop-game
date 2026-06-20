import React, { useState, useCallback, useEffect, useRef } from "react";
import { chooseColumns, endRun, rollDice } from "@/services/ipc";
import { notifyError } from "@/services/notifications";
import { DiceResult, GameState, PlayerChoice, PlayerColors } from "@/types";
import DiceContainer from "./rolling/dice";
import ChoiceContainer from "./rolling/choice";
import TurnStartContainer from "./rolling/turnStart";
import { useTour } from "@reactour/tour";
import { MdQuestionMark } from "react-icons/md";
import { AiAction, useAiTurn } from "@/hooks/useAiTurn";
import { motion, AnimatePresence } from "motion/react";

const ThoughtBubble = false; // Set to true to enable thought bubble for AI players.

type RollerProps = {
  setGameState: React.Dispatch<React.SetStateAction<GameState | undefined>>;
  gameState: GameState;
};

type CroakPopup = {
  id: number;
  playerName: string;
  color: string;
};

const DiceRoller: React.FC<RollerProps> = ({ setGameState, gameState }) => {
  const playerIndex = gameState.current_player;
  const player = gameState.settings.players[playerIndex];
  const [dice, setDice] = useState<DiceResult>({ dice: [], choices: [] });
  const [croakPopup, setCroakPopup] = useState<CroakPopup | null>(null);
  const croakPopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousAiActionRef = useRef<AiAction>(null);
  const {
    currentStep,
    setCurrentStep,
    isOpen: isTourOpen,
    setIsOpen,
  } = useTour();
  const [showTutorial, setShowTutorial] = useState(true);

  // Wrap functions passed to the hook in useCallback to stabilize their references
  const updateDice = useCallback(async () => {
    setShowTutorial(false); // tutorial only valid at very start of the game.
    // Clear previous roll if needed.
    setDice({ dice: [], choices: [] });
    // Small delay before showing result (simulate rolling).
    setTimeout(async () => {
      const newDice = await rollDice();
      if (newDice !== undefined) {
        setDice(newDice);
      }
      if (isTourOpen) {
        setCurrentStep(currentStep + 1);
      }
    }, 100);
  }, [isTourOpen, currentStep, setCurrentStep]);

  const makeChoice = useCallback(
    async (choice: PlayerChoice) => {
      const state = await chooseColumns(choice);
      setDice({ dice: [], choices: [] });
      if (state) {
        setGameState(state);
        if (isTourOpen && currentStep === 3) {
          setCurrentStep(currentStep + 1);
        }
      } else {
        notifyError("Something went wrong choosing columns", "choiceError");
      }
    },
    [setGameState, isTourOpen, currentStep, setCurrentStep]
  );

  const endPlayerRun = useCallback(
    async (forced: boolean) => {
      const state = await endRun(forced);
      setDice({ dice: [], choices: [] });
      setGameState(state);
    },
    [setGameState]
  );

  // --- Use the AI Hook ---
  const { aiAction, aiTargetChoice, aiThought } = useAiTurn({
    player,
    dice,
    gameState,
    isTourOpen,
    updateDice,
    makeChoice,
    endPlayerRun,
  });

  useEffect(() => {
    const previousAiAction = previousAiActionRef.current;
    previousAiActionRef.current = aiAction;

    if (
      player.mode === "Human" ||
      aiAction !== "croaked" ||
      previousAiAction === "croaked"
    ) {
      return;
    }

    if (croakPopupTimerRef.current) {
      clearTimeout(croakPopupTimerRef.current);
    }

    setCroakPopup({
      id: Date.now(),
      playerName: player.name,
      color: PlayerColors[playerIndex],
    });

    croakPopupTimerRef.current = setTimeout(() => {
      setCroakPopup(null);
      croakPopupTimerRef.current = null;
    }, 2400);
  }, [aiAction, player.mode, player.name, playerIndex]);

  useEffect(() => {
    return () => {
      if (croakPopupTimerRef.current) {
        clearTimeout(croakPopupTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center space-y-4">
      <AnimatePresence>
        {croakPopup && (
          <motion.div
            key={croakPopup.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, x: "-50%", y: -18, scale: 0.92 }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
            exit={{ opacity: 0, x: "-50%", y: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-none fixed left-1/2 top-6 z-50 w-[min(92vw,26rem)] overflow-hidden rounded-lg border-2 bg-emerald-950/90 px-5 py-4 text-center text-white shadow-2xl backdrop-blur-md"
            style={{
              borderColor: croakPopup.color,
              boxShadow: `0 18px 40px ${croakPopup.color}44`,
            }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px"
              style={{ backgroundColor: croakPopup.color }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.32, delay: 0.08 }}
            />
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl"
                style={{
                  backgroundColor: `${croakPopup.color}22`,
                  color: croakPopup.color,
                }}
              >
                !
              </span>
              <div className="min-w-0 text-left">
                <div
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: croakPopup.color }}
                >
                  Croaked
                </div>
                <div className="text-base font-semibold leading-tight">
                  {croakPopup.playerName} got stuck in the mud.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {ThoughtBubble && (
        <div className="pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-20 flex w-screen -translate-x-1/2 justify-center px-4">
          <AnimatePresence mode="wait">
            {player.mode !== "Human" && aiThought && (
              <motion.div
                key={aiThought}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="relative max-w-[min(88vw,28rem)] rounded-lg border bg-neutral-950/55 px-4 py-3 text-center text-sm leading-snug text-white/90 shadow-lg backdrop-blur-sm"
                style={{ borderColor: PlayerColors[playerIndex] }}
              >
                <span
                  aria-hidden="true"
                  className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r bg-neutral-950/55 backdrop-blur-sm"
                  style={{ borderColor: PlayerColors[playerIndex] }}
                />
                <span className="relative z-10">{aiThought}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {dice.dice.length == 0 && (
        <TurnStartContainer
          mode={player.mode}
          hops={gameState.hops}
          updateDice={updateDice}
          endPlayerRun={endPlayerRun}
          aiAction={aiAction}
          playerIndex={playerIndex}
        />
      )}
      <DiceContainer playerIndex={playerIndex} dice={dice.dice} />
      <ChoiceContainer
        dice={dice}
        playerIndex={playerIndex}
        mode={player.mode}
        endPlayerTurn={endPlayerRun}
        makeChoice={makeChoice}
        aiAction={aiAction}
        aiTargetChoice={aiTargetChoice}
      />
      {showTutorial && player.mode === "Human" && (
        <button
          type="button"
          className="fixed bottom-0 right-2 m-4 p-2 h-12 w-32 border rounded mx-2 btn btn-xl bg-green-300 text-black"
          onClick={() => setIsOpen(true)}
        >
          Tutorial <MdQuestionMark />
        </button>
      )}
    </div>
  );
};

export default DiceRoller;
