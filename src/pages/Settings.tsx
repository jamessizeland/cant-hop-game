/** Settings for the game.  This page is loaded once before a game starts to determine rules and player count. */

import PlayerForm from "components/elements/form";
import { useEffect, useState } from "react";
import { getGameState, getName } from "services/ipc";

export function SettingsPage() {
  const [resume, setResume] = useState(false);
  const [names, setNames] = useState<[string, string]>([
    "Player 1",
    "Player 2",
  ]);
  useEffect(() => {
    getName().then((name1) => {
      getName().then((name2) => {
        setNames([name1, name2]);
      });
    });
    getGameState().then((state) => {
      setResume(state.in_progress);
    });
  }, []);

  useEffect(() => {}, []);
  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <h1 className="m-2 text-2xl font-bold uppercase">Settings</h1>
      <PlayerForm first={names[0]} second={names[1]} />
      {resume ? (
        <button
          className="fixed bottom-0 right-2 m-4 p-2 h-12 w-32 border rounded mx-2 btn btn-xl bg-green-300 text-black"
          onClick={() => (window.location.href = "/game")}
        >
          Resume
        </button>
      ) : (
        <></>
      )}
    </div>
  );
}
