import { useEffect, useState } from "react";
import { getGameStatistics, startGame, stopGame } from "services/ipc";
import { GameState, PlayerColors, PlayerStats, StatsSummary } from "types";

type GameOverModalProps = {
  gameState: GameState;
};

type Verdict = {
  title: string;
  detail: string;
};

function describeLuck(luck: number): string {
  if (luck >= 0.12) return "very lucky";
  if (luck >= 0.05) return "lucky";
  if (luck <= -0.12) return "very unlucky";
  if (luck <= -0.05) return "unlucky";
  return "steady";
}

function getVerdict(playerStat: PlayerStats, didWin: boolean): Verdict {
  const luck = describeLuck(playerStat.luck);
  const finishedRuns = playerStat.banked + playerStat.croaked;
  const croakRate = finishedRuns ? playerStat.croaked / finishedRuns : 0;

  if (didWin) {
    if (luck === "very lucky" || luck === "lucky") {
      return {
        title: "Won with a friendly pond",
        detail: "The risks landed kindly, and the win made the most of it.",
      };
    }
    if (luck === "very unlucky" || luck === "unlucky") {
      return {
        title: "Won the hard way",
        detail: "The rolls fought back, but the banked progress held together.",
      };
    }
    return {
      title: "Won with steady hopping",
      detail: "A balanced game: enough pressure, enough restraint, and no big swing needed.",
    };
  }

  if (luck === "very lucky" || luck === "lucky") {
    return {
      title: "Lost despite kind rolls",
      detail: "The chances were there, but they did not turn into enough safe progress.",
    };
  }
  if (croakRate >= 0.5) {
    return {
      title: "Pushed too hard",
      detail: "Too many promising runs ended before they could be banked.",
    };
  }
  if (luck === "very unlucky" || luck === "unlucky") {
    return {
      title: "Lost to rough rolls",
      detail: "The choices were not the problem; the dice were simply unkind.",
    };
  }
  return {
    title: "Stayed close",
    detail: "Solid play, but not quite enough column pressure before the finish.",
  };
}

const GameOverModal: React.FC<GameOverModalProps> = ({ gameState }) => {
  const [stats, setStats] = useState<StatsSummary>();

  useEffect(() => {
    getGameStatistics().then((stats) => {
      setStats(stats);
    });
  }, []);

  if (!gameState.winner) {
    return null; // Don't render the modal if there's no winner
  }
  const winnerName = gameState.winner.name;
  const winnerIndex = gameState.settings.players.findIndex(
    (player) => player.id === gameState.winner?.id
  );
  const safeWinnerIndex = winnerIndex >= 0 ? winnerIndex : 0;
  const winnerColor = PlayerColors[safeWinnerIndex];

  return (
    <dialog id="game-over" className="modal modal-open">
      <div
        className="modal-box flex max-h-[90dvh] flex-col items-center justify-center"
        style={{
          borderColor: winnerColor,
          borderWidth: "2px",
          borderStyle: "solid",
        }}
      >
        <h3 className="font-bold text-2xl" style={{ color: winnerColor }}>
          {winnerName} Wins!
        </h3>
        <div className="divider">How It Went</div>
        <div className="w-full overflow-y-auto">
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <div className="rounded border border-base-300 p-3">
              <div className="text-xs uppercase opacity-70">Busiest Column</div>
              <div className="text-3xl font-bold">
                {stats?.most_contested_column || "..."}
              </div>
            </div>
            <div className="rounded border border-base-300 p-3">
              <div className="text-xs uppercase opacity-70">Rolls</div>
              <div className="text-3xl font-bold">
                {stats?.total_turns ?? "..."}
              </div>
            </div>
          </div>

          <div className="mt-4 flex w-full flex-col gap-3">
            {stats?.player_stats.map((playerStat, index) => {
              const player = gameState.settings.players[index];
              const verdict = getVerdict(playerStat, index === safeWinnerIndex);

              return (
                <section
                  key={player.id}
                  className="rounded border border-base-300 p-3"
                >
                  <h4
                    className="font-bold"
                    style={{ color: PlayerColors[index] }}
                  >
                    {player.name}
                  </h4>
                  <p className="mt-1 text-lg font-semibold">{verdict.title}</p>
                  <p className="mt-1 text-sm opacity-80">{verdict.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-75">
                    <span>{playerStat.longest_run} hop best run</span>
                    <span>{playerStat.banked} banked</span>
                    <span>{playerStat.croaked} croaked</span>
                    <span>{describeLuck(playerStat.luck)} rolls</span>
                  </div>
                </section>
              );
            })}
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm opacity-80">
              Show raw stats
            </summary>
            <div className="mt-2 w-full">
              {stats?.player_stats.map((playerStat, index) => (
                <div key={gameState.settings.players[index].id}>
                  <h3>
                    <span
                      style={{
                        color: PlayerColors[index],
                        fontWeight: "bold",
                      }}
                    >
                      {gameState.settings.players[index].name}
                    </span>
                  </h3>
                  <table className="table table-zebra w-full">
                    <tbody>
                      <tr>
                        <td>Longest Run</td> <td>{playerStat.longest_run}</td>
                      </tr>
                      <tr>
                        <td>Rolls</td> <td>{playerStat.total_rolls}</td>
                      </tr>
                      <tr>
                        <td>Croaked</td> <td>{playerStat.croaked}</td>
                      </tr>
                      <tr>
                        <td>Banked</td> <td>{playerStat.banked}</td>
                      </tr>
                      <tr>
                        <td>Luck</td> <td>{playerStat.luck.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </details>
        </div>
        <div className="modal-action flex justify-center">
          <button
            className="btn"
            onClick={async () => {
              await stopGame();
              await startGame(gameState.settings);
              window.location.href = "/game";
            }}
          >
            Rematch?
          </button>
          <button
            className="btn"
            onClick={async () => {
              await stopGame();
              window.location.href = "/";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default GameOverModal;
