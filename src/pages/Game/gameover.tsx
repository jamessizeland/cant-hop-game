import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { notifyError, notifySuccess } from "@/services/notifications";
import {
  getCareerStatistics,
  getGameStatistics,
  startGame,
  stopGame,
} from "@/services/ipc";
import {
  AchievementRecord,
  CareerStats,
  GameState,
  PlayerColors,
  PlayerStats,
  StatsSummary,
} from "@/types";
import { BiCopy, BiLogoWhatsapp } from "react-icons/bi";

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
  const [careerStats, setCareerStats] = useState<CareerStats>();

  useEffect(() => {
    getGameStatistics().then((stats) => {
      setStats(stats);
    });
    getCareerStatistics().then((stats) => {
      setCareerStats(stats);
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
  const latestAchievementTime = careerStats?.achievements.reduce(
    (latest, achievement) => Math.max(latest, achievement.achieved_at_ms),
    0
  );
  const latestAchievements = careerStats?.achievements
    .filter(
      (achievement) =>
        achievement.achieved_at_ms === latestAchievementTime &&
        gameState.settings.players.some(
          (player) => player.name === achievement.player_name
        )
    )
    .reverse();
  const shareSummary = stats
    ? buildShareSummary(
        gameState,
        stats,
        safeWinnerIndex,
        latestAchievements ?? []
      )
    : "";

  async function copyShareSummary() {
    if (!shareSummary) return;
    try {
      await copyText(shareSummary);
      notifySuccess("Game summary copied", "ShareSummaryCopied");
    } catch (error) {
      notifyError(`Failed to copy summary: ${error}`, "ShareSummaryCopyError");
    }
  }

  async function shareToWhatsApp() {
    if (!shareSummary) return;
    try {
      await openUrl(`https://wa.me/?text=${encodeURIComponent(shareSummary)}`);
    } catch (error) {
      notifyError(`Failed to open WhatsApp: ${error}`, "ShareWhatsAppError");
    }
  }

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

          {latestAchievements && latestAchievements.length > 0 && (
            <>
              <div className="divider">Fresh Achievements</div>
              <div className="flex w-full flex-col gap-2">
                {latestAchievements.map((achievement) => (
                  <AchievementItem
                    key={`${achievement.kind}-${achievement.title}-${achievement.player_name}-${achievement.achieved_at_ms}`}
                    achievement={achievement}
                  />
                ))}
              </div>
            </>
          )}

          <div className="divider">Share</div>
          <section className="rounded border border-base-300 p-3">
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn btn-sm"
                onClick={shareToWhatsApp}
                disabled={!shareSummary}
              >
                <BiLogoWhatsapp />
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={copyShareSummary}
                disabled={!shareSummary}
              >
                <BiCopy />
              </button>
            </div>
          </section>

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

function buildShareSummary(
  gameState: GameState,
  stats: StatsSummary,
  winnerIndex: number,
  achievements: AchievementRecord[]
): string {
  const playerLines = stats.player_stats.map((stat, index) => {
    const name = gameState.settings.players[index].name;
    const verdict = getVerdict(stat, index === winnerIndex);
    const icon = index === winnerIndex ? "🏆" : "🐸";
    
    return `${icon} ${name}: best run ${stat.longest_run} | banked ${stat.banked} | croaked ${stat.croaked} (${verdict.title})`;
  });

  const achievementLines = achievements.length > 0
    ? [
        "",
        "🌟 Achievements:",
        ...achievements.map((a) => `✨ ${a.player_name} - ${a.title}`)
      ]
    : [];

  return [
    "🐸 Can't Hop 🐸",
    `🎲 ${stats.total_turns} rolls`,
    "",
    ...playerLines,
    ...achievementLines
  ].join("\n");
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("clipboard unavailable");
  }
}

function AchievementItem({
  achievement,
}: {
  achievement: AchievementRecord;
}) {
  return (
    <section className="rounded border border-accent/40 bg-accent/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold">{achievement.title}</h4>
          <p className="mt-1 text-sm opacity-85">{achievement.message}</p>
        </div>
        <time className="shrink-0 text-xs opacity-70">
          {formatAchievementDate(achievement.achieved_at_ms)}
        </time>
      </div>
    </section>
  );
}

function formatAchievementDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export default GameOverModal;
