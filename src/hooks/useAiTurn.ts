import { useEffect, useState, useRef, useCallback } from "react";
import { aiCheckContinue, aiChooseColumn } from "services/ipc";
import { notifyError, notifyInfo } from "services/notifications";
import { DiceResult, GameState, Player, PlayerChoice } from "types";

interface UseAiTurnProps {
  player: Player;
  dice: DiceResult;
  gameState: GameState;
  isTourOpen: boolean;
  updateDice: () => Promise<void>;
  makeChoice: (choice: PlayerChoice) => Promise<void>;
  endPlayerRun: (forced: boolean) => Promise<void>;
}

export type AiAction = "hop" | "stop" | "choose" | "croaked" | null;

export interface UseAiTurnResult {
  aiAction: AiAction;
  aiTargetChoice: PlayerChoice | null;
}

export const useAiTurn = ({
  player,
  dice,
  gameState,
  isTourOpen,
  updateDice,
  makeChoice,
  endPlayerRun,
}: UseAiTurnProps): UseAiTurnResult => {
  const [aiAction, setAiAction] = useState<AiAction>(null);
  const [aiTargetChoice, setAiTargetChoice] = useState<PlayerChoice | null>(
    null
  );
  const [isAiActing, setIsAiActing] = useState(false); // Prevent overlapping AI actions
  const decisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false); // Ref to track if actively processing within an effect run

  // Helper to clear timers
  const clearTimers = useCallback(() => {
    if (decisionTimerRef.current) clearTimeout(decisionTimerRef.current);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    decisionTimerRef.current = null;
    actionTimerRef.current = null;
    isProcessingRef.current = false; // Reset processing flag on clear
  }, []);

  // Effect for AI deciding Hop/Stop
  useEffect(() => {
    // --- DEBUG LOG 1 ---
    console.log(
      "[AI Effect 1 Triggered] Deps:",
      `Mode: ${player.mode}`,
      `Dice Len: ${dice.dice.length}`,
      `Acting: ${isAiActing}`,
      `Hops: ${gameState.hops}`,
      `Tour: ${isTourOpen}`
    );

    if (
      player.mode !== "Human" &&
      dice.dice.length === 0 &&
      !isProcessingRef.current && // Check ref to prevent re-entry during processing
      gameState.hops >= 0 &&
      !isTourOpen
    ) {
      // --- DEBUG LOG 2 ---
      console.log("[AI Effect 1] Condition Met. Setting isAiActing=true.");

      isProcessingRef.current = true; // Mark as processing *before* async operations/timeouts
      setIsAiActing(true); // Signal that AI is now busy (causes re-render)

      const decisionDelay = 500;
      const actionDelay = 750;

      //   notifyInfo(`AI (${player.name}) thinking...`, "ai");
      decisionTimerRef.current = setTimeout(async () => {
        // --- DEBUG LOG 3 ---
        console.log("[AI Effect 1] Decision Timeout Executing...");

        try {
          const isContinue = await aiCheckContinue();
          setAiAction(isContinue ? "hop" : "stop");
          //   notifyInfo(
          //     `AI (${player.name}) decided to ${isContinue ? "Hop" : "Stop"}`,
          //     "ai"
          //   );

          actionTimerRef.current = setTimeout(async () => {
            if (isContinue) {
              await updateDice();
              // isAiActing remains true until choice/croak effect handles it
            } else {
              await endPlayerRun(false); // This resets isAiActing via its own logic
            }
            actionTimerRef.current = null; // Clear ref after execution
          }, actionDelay);
        } catch (error) {
          console.error("AI failed to decide Hop/Stop:", error);
          notifyError("AI encountered an error deciding.", "aiError");
          setAiAction(null);
          setAiTargetChoice(null);
          setIsAiActing(false);
          isProcessingRef.current = false; // Reset ref on error
        }
        decisionTimerRef.current = null; // Clear ref after execution
      }, decisionDelay);

      // Cleanup clears timers if component unmounts or dependencies change mid-process
      return clearTimers;
    } else if (player.mode === "Human" || isTourOpen) {
      // Reset AI state if player becomes human or tour starts
      if (isAiActing || aiAction || aiTargetChoice) {
        setAiAction(null);
        setAiTargetChoice(null);
        setIsAiActing(false);
        isProcessingRef.current = false; // Ensure ref is false if switching away
        clearTimers(); // Clear any pending AI actions
      }
    }
  }, [
    player.mode,
    player.name,
    dice.dice.length,
    gameState.hops,
    gameState.current_player,
    isTourOpen,
    updateDice,
    endPlayerRun,
    clearTimers,
  ]);

  // Effect for AI making a choice or handling "Croaked"
  useEffect(() => {
    // --- DEBUG LOG ---
    console.log(
      "[AI Effect 2 Triggered] Deps:",
      `Mode: ${player.mode}`,
      `Dice Len: ${dice.dice.length}`,
      `Acting: ${isAiActing}`, // This effect *should* run when isAiActing is true and dice are present
      `Tour: ${isTourOpen}`
    );

    if (
      player.mode !== "Human" &&
      dice.dice.length > 0 &&
      isAiActing && // Should still be true from the Hop/Stop effect if it rolled dice
      !isTourOpen
    ) {
      const decisionDelay = 500;
      const actionDelay = 750;

      // --- DEBUG LOG ---
      console.log("[AI Effect 2] Condition Met. Setting decision timeout.");

      decisionTimerRef.current = setTimeout(async () => {
        try {
          if (dice.choices.length > 0) {
            // notifyInfo(`AI (${player.name}) choosing column...`, "ai");
            const chosenChoice = await aiChooseColumn(dice);
            setAiTargetChoice(chosenChoice);
            setAiAction("choose");
            // notifyInfo(
            //   `AI (${player.name}) chose ${chosenChoice[0]}${
            //     chosenChoice[1] ? ` & ${chosenChoice[1]}` : ""
            //   }`,
            //   "ai"
            // );

            actionTimerRef.current = setTimeout(async () => {
              await makeChoice(chosenChoice);
              // Reset state for the next potential Hop/Stop decision in the same turn
              setAiAction(null);
              setAiTargetChoice(null);
              setIsAiActing(false); // Ready for next Hop/Stop check
              // isProcessingRef is already false or will be cleared by clearTimers
              actionTimerRef.current = null;
            }, actionDelay);
          } else {
            notifyInfo(`AI (${player.name}) Croaked!`, "ai");
            setAiAction("croaked");
            actionTimerRef.current = setTimeout(async () => {
              await endPlayerRun(true); // This resets isAiActing via its own logic
              // isProcessingRef is already false or will be cleared by clearTimers
              actionTimerRef.current = null;
            }, actionDelay);
          }
        } catch (error) {
          console.error("AI failed to make choice or handle croaked:", error);
          notifyError("AI encountered an error choosing.", "aiError");
          setAiAction(null);
          setAiTargetChoice(null);
          setIsAiActing(false);
          // isProcessingRef is already false or will be cleared by clearTimers
        }
        decisionTimerRef.current = null;
      }, decisionDelay);

      // Cleanup clears timers
      return clearTimers;
    }
  }, [
    player.mode,
    player.name,
    dice,
    isAiActing, // Keep isAiActing here - this effect depends on it being true
    isTourOpen,
    makeChoice,
    endPlayerRun,
    clearTimers,
  ]); // Depends on dice results

  // Return the state needed by the UI
  return { aiAction, aiTargetChoice };
};
