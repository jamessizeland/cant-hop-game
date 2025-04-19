import Bar from "components/elements/bar";
import DiceRoller from "components/elements/rolling";
import Loader from "components/Layout/loader";
import { useEffect, useState } from "react";
import { MdClose, MdDeveloperMode } from "react-icons/md";
import { getGameState } from "services/ipc";
import { GameState, PlayerColors } from "types";
import { DemoColumns } from "types/placeholders";
import { checkEnv } from "utils";

const backgroundStyle = {
  // background: `radial-gradient(ellipse at center, rgba(49,130,206,1) 170px, rgba(12, 84, 6, 0.8) 200px, rgba(12, 84, 6, 0) 205px)`,
};

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
            <dialog id="game-over" className="modal modal-open">
              <div className="modal-box flex justify-center">
                <h3 className="font-bold text-xl">Winner!</h3>
                <div className="modal-action flex justify-center">
                  <button
                    className="btn"
                    onClick={() => (window.location.href = "/")}
                  >
                    Close
                  </button>
                </div>
              </div>
            </dialog>
          )}
          <TopBar
            playerName={playerName}
            setDemo={setDemo}
            playerIndex={gameState.current_player}
          />
          <div
            className="w-screen flex items-center justify-center flex-col py-3 px-5 mt-7"
            style={backgroundStyle}
          >
            <div className="flex items-center w-screen justify-center">
              {(demo ? DemoColumns : gameState.columns).map(
                (column, index: number) => (
                  <Bar
                    key={index}
                    value={column.col}
                    total={column.height}
                    hops={column.hops}
                    risked={column.risked}
                    currentPlayer={gameState?.current_player}
                    winner={column.locked}
                  />
                )
              )}
            </div>
          </div>
          {gameState.winner === null && (
            <DiceRoller
              setGameState={setGameState}
              playerIndex={gameState.current_player}
            />
          )}
        </>
      ) : (
        <Loader />
      )}
    </div>
  );
}

const TopBar = ({
  playerName,
  setDemo,
  playerIndex,
}: {
  playerName: string;
  setDemo?: React.Dispatch<React.SetStateAction<boolean>>;
  playerIndex?: number;
}) => {
  return (
    <div className="w-screen h-10 text-white flex items-center justify-center absolute">
      {checkEnv("development") && (
        <button
          type="button"
          className="absolute left-5 text-2xl mt-1"
          onClick={() => {
            if (setDemo) setDemo((demo) => !demo);
          }}
        >
          <MdDeveloperMode />
        </button>
      )}
      <h1
        className="text-lg font-bold"
        style={{
          color: PlayerColors[playerIndex ?? 0],
        }}
      >
        {playerName}
      </h1>
      <button
        type="button"
        className="absolute right-5 text-2xl"
        onClick={() => (location.href = "/")}
      >
        <MdClose />
      </button>
    </div>
  );
};
