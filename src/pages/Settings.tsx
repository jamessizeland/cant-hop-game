/** Settings for the game.  This page is loaded once before a game starts to determine rules and player count. */

import Footer from "components/Layout/footer";
import PlayerForm from "components/elements/form";
import { useEffect, useState } from "react";
import { getName } from "services/ipc";

export function SettingsPage() {
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
  }, []);

  useEffect(() => {}, []);
  return (
    <div className="flex flex-col items-center h-screen w-screen">
      <h1 className="m-2 text-2xl font-bold uppercase">Settings</h1>
      <PlayerForm first={names[0]} second={names[1]} />
      <Footer />
    </div>
  );
}
