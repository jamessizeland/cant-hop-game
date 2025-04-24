import DiceRoller from "components/elements/rolling";
import Loader from "components/Layout/loader";
import { useEffect, useState } from "react";
import { getGameState } from "services/ipc";
import { GameState } from "types";
import GameOverModal from "./Game/gameover";
import TopBar from "./Game/topbar";
import GameBoard from "./Game/board";

export function GamePage() {
  const [gameState, setGameState] = useState<GameState>();
  const [demo, setDemo] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    getGameState().then((state) => {
      setGameState(state);
    });
  }, []);

  useEffect(() => {
    console.log("Game State Updated", gameState);
    if (!gameState) return;
    setPlayerName(gameState.settings.players[gameState.current_player]?.name);
    if (gameState.winner !== null) {
      setGameOver(true);
    }
  }, [gameState]);

  return (
    <div className="flex flex-col items-center h-screen w-screen">
      {gameState ? (
        <>
          {gameOver && gameState.winner !== null && (
            <GameOverModal gameState={gameState} />
          )}
          <TopBar
            playerName={playerName}
            setDemo={setDemo}
            playerIndex={gameState.current_player}
          />
          <div className="w-screen flex items-center justify-center flex-col py-3 px-5 mt-7">
            <GameBoard gameState={gameState} demo={demo} />
          </div>
          {gameState.winner === null && (
            <DiceRoller
              setGameState={setGameState}
              playerIndex={gameState.current_player}
              hops={gameState.hops}
            />
          )}
        </>
      ) : (
        <Loader />
      )}
    </div>
  );
}
