import React, { useEffect, useState } from "react";
import {
  aiCheckContinue,
  chooseColumns,
  endTurn,
  rollDice,
} from "services/ipc";
import { notifyError } from "services/notifications";
import { DiceResult, GameState, PlayerChoice } from "types";
import DiceContainer from "./rolling/dice";
import ChoiceContainer from "./rolling/choice";
import TurnStartContainer from "./rolling/turnStart";
import { useTour } from "@reactour/tour";
import { MdQuestionMark } from "react-icons/md";

type RollerProps = {
  setGameState: React.Dispatch<React.SetStateAction<GameState | undefined>>;
  gameState: GameState;
};

const DiceRoller: React.FC<RollerProps> = ({ setGameState, gameState }) => {
  const playerIndex = gameState.current_player;
  const player = gameState.settings.players[playerIndex];
  const [dice, setDice] = useState<DiceResult>({ dice: [], choices: [] });
  const {
    currentStep,
    setCurrentStep,
    isOpen: isTourOpen,
    setIsOpen,
  } = useTour();
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    if (player.mode !== "Human") {
      setTimeout(async () => {
        aiCheckContinue().then((isContinue) => {
          if (!isContinue) {
            endPlayerTurn(false);
          }
        });
      }, 500);
    }
  }, [gameState]);

  const updateDice = async () => {
    setShowTutorial(false); // tutorial only valid at very start of the game.
    // Clear previous roll if needed.
    setDice({ dice: [], choices: [] });
    // Small delay before showing result (simulate rolling).
    setTimeout(async () => {
      const newDice = await rollDice();
      setDice(newDice);
      if (isTourOpen) {
        setCurrentStep(currentStep + 1);
      }
    }, 100);
  };

  const makeChoice = async (choice: PlayerChoice) => {
    const state = await chooseColumns(choice);
    setDice({ dice: [], choices: [] });
    if (state) {
      console.log("updating choices");
      setGameState(state);
      if (isTourOpen && currentStep === 3) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      notifyError("Something went wrong choosing columns", "choiceError");
    }
  };

  const endPlayerTurn = async (forced: boolean) => {
    const state = await endTurn(forced);
    setDice({ dice: [], choices: [] });
    setGameState(state);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {dice.dice.length == 0 && (
        <TurnStartContainer
          mode={player.mode}
          hops={gameState.hops}
          updateDice={updateDice}
          endPlayerTurn={endPlayerTurn}
        />
      )}
      <DiceContainer playerIndex={playerIndex} dice={dice.dice} />
      <ChoiceContainer
        dice={dice}
        playerIndex={playerIndex}
        mode={player.mode}
        endPlayerTurn={endPlayerTurn}
        makeChoice={makeChoice}
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
