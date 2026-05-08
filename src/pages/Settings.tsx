/** Settings for the game.  This page is loaded once before a game starts to determine rules and player count. */

import PlayerForm from "@/components/elements/form";
import { useEffect, useState } from "react";
import { LiaAwardSolid } from "react-icons/lia";
import { Link } from "react-router-dom";
import { getGameState, getName } from "@/services/ipc";
import { checkForAppUpdate, diagnoseAppUpdate } from "@/services/updater";
import { MdClose } from "react-icons/md";

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
      <div className="flex w-full items-center justify-center px-4 pt-2">
        <h1 className="m-2 text-2xl font-bold uppercase">Settings</h1>
        <Link
          to="/stats"
          className="btn btn-square btn-ghost absolute right-4 top-2 border-2 border-gray-300 rounded"
          title="Career statistics"
          aria-label="Career statistics"
        >
        <LiaAwardSolid className="text-2xl" />
        </Link>
        <Link
          to="/"
          className="absolute left-4 top-4 text-2xl"
          aria-label="Back to settings"
          >
          <MdClose />
        </Link>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-sm btn-outline" onClick={diagnoseAppUpdate}>
          Update Diagnostics
        </button>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => checkForAppUpdate(true)}
        >
          Check Update
        </button>
      </div>
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
