import Bar from "components/elements/bar";
import DiceRoller from "components/elements/rolling";
import Loader from "components/Layout/loader";
import { useEffect, useState } from "react";
import { MdClose, MdDeveloperMode } from "react-icons/md";
import { getGameState } from "services/ipc";
import { GameState } from "types";
import { DemoColumns } from "types/placeholders";

const backgroundStyle = {
  // background: `radial-gradient(ellipse at center, rgba(49,130,206,1) 170px, rgba(12, 84, 6, 0.8) 200px, rgba(12, 84, 6, 0) 205px)`,
};

export function GamePage() {
  const [gameState, setGameState] = useState<GameState>();
  const [demo, setDemo] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");

  useEffect(() => {
    getGameState().then((state) => {
      setGameState(state);
    });
  }, []);

  useEffect(() => {
    console.log("Game State Updated", gameState);
    if (!gameState) return;
    setPlayerName(gameState.settings.players[gameState.current_player]?.name);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center h-screen w-screen">
      {gameState ? (
        <>
          <TopBar playerName={playerName} setDemo={setDemo} />
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
                  />
                )
              )}
            </div>
          </div>
          <DiceRoller setGameState={setGameState} />
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
}: {
  playerName: string;
  setDemo?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="w-screen h-10 text-white flex items-center justify-center absolute">
      <button
        type="button"
        className="absolute left-5 text-2xl mt-1"
        onClick={() => {
          if (setDemo) setDemo((demo) => !demo);
        }}
      >
        <MdDeveloperMode />
      </button>
      <h1 className="text-lg font-bold">{playerName}</h1>
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
