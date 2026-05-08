import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCareerStatistics, resetAchievements } from "@/services/ipc";
import { AchievementKind, CareerStats } from "@/types";
import Modal from "@/components/elements/modal";
import { MdClose } from "react-icons/md";

const ACHIEVEMENT_CATALOG: {
  id: string;
  kind: AchievementKind;
  title: string;
  description: string;
}[] = [
  {
    id: "ThreeHopHero",
    kind: "ThreeHopHero",
    title: "Six-Hop Hero",
    description: "Bank a run of 6 or more hops.",
  },
  {
    id: "StillStanding",
    kind: "StillStanding",
    title: "Still Standing",
    description: "Survive a very high-risk roll.",
  },
  {
    id: "NoSplash",
    kind: "NoSplash",
    title: "No Splash",
    description: "Win a long game with zero croaks.",
  },
  {
    id: "LeapOfFaith",
    kind: "LeapOfFaith",
    title: "Leap of Faith",
    description: "Win after taking heavy average risk.",
  },
  {
    id: "CloseCall",
    kind: "CloseCall",
    title: "Close Call",
    description: "Lose a substantial game despite very lucky rolls.",
  },
  {
    id: "Shutout",
    kind: "Shutout",
    title: "Clean Sweep",
    description: "Win a substantial game before any opponent scores a column.",
  },
  {
    id: "SnatchedAtTheTop",
    kind: "SnatchedAtTheTop",
    title: "Snatched at the Top",
    description: "Win a column when an opponent is one hop away.",
  },
  {
    id: "Bookends",
    kind: "Bookends",
    title: "Bookends",
    description: "Win both columns 2 and 12 in the same game.",
  },
  {
    id: "AgainstTheOdds",
    kind: "AgainstTheOdds",
    title: "Against the Odds",
    description:
      "Win with very unlucky rolls while an opponent had very lucky rolls.",
  },
  {
    id: "CenterPerch",
    kind: "CenterPerch",
    title: "Center Perch",
    description: "Win column 7 despite unlucky rolls.",
  },
  {
    id: "HighWireWin",
    kind: "HighWireWin",
    title: "High-Wire Win",
    description: "Win while carrying very high average risk.",
  },
  {
    id: "FiveHopFlex",
    kind: "FiveHopFlex",
    title: "Eight-Hop Flex",
    description: "Bank a run of 8 or more hops.",
  },
  {
    id: "SevenHopShowoff",
    kind: "SevenHopShowoff",
    title: "Ten-Hop Showoff",
    description: "Bank a run of 10 or more hops.",
  },
  {
    id: "PerfectLanding",
    kind: "PerfectLanding",
    title: "Perfect Landing",
    description: "Win a marathon without croaking once.",
  },
  {
    id: "ComebackCroaker",
    kind: "ComebackCroaker",
    title: "Comeback Croaker",
    description: "Win after croaking at least 4 times.",
  },
  {
    id: "Bankroll",
    kind: "Bankroll",
    title: "Bankroll",
    description: "Bank at least 8 runs in one game.",
  },
  {
    id: "TripleCrown",
    kind: "TripleCrown",
    title: "Four-Column Finish",
    description: "Win 4 or more columns in one game.",
  },
  ...([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).flatMap((column) =>
    ([10, 25, 50, 100, 250, 500, 1000] as const).map((milestone) => ({
      id: `Column ${column}: ${milestone} Tops`,
      kind: "ColumnToppedMilestone" as AchievementKind,
      title: `Column ${column}: ${milestone} Tops`,
      description: `Top column ${column} ${milestone} times across this device.`,
    }))
  ),
];

export function StatsPage() {
  const [stats, setStats] = useState<CareerStats>();
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);

  useEffect(() => {
    getCareerStatistics().then(setStats);
  }, []);

  const topColumns = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.columns_won_most_often)
      .map(([column, wins]) => ({ column: Number(column), wins }))
      .sort((left, right) => right.wins - left.wins)
      .slice(0, 5);
  }, [stats]);

  const achievements = stats?.achievements.slice().reverse() ?? [];
  const earnedAchievementIds = new Set(
    stats?.achievements.map(achievementId) ?? []
  );

  function handleResetAchievements() {
    setIsResetConfirmationOpen(true);
  }

  async function confirmResetAchievements() {
    setIsResetConfirmationOpen(false);
    const nextStats = await resetAchievements();
    setStats(nextStats);
  }

  return (
    <main className="h-dvh overflow-y-auto px-5 py-6 pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/settings"
                className="absolute right-6 top-4 text-2xl"
                aria-label="Back to settings"
              >
                <MdClose />
              </Link>
              <h1 className="text-3xl font-bold">Statistics</h1>
              <p className="mt-1 text-sm opacity-75">
                Device-wide totals for human players on this device.
              </p>
            </div>
          </div>
        </header>

        {!stats ? (
          <div className="rounded border border-base-300 p-4">Loading...</div>
        ) : stats.human_games_played === 0 ? (
          <div className="rounded border border-base-300 p-4">
            Finish a game with at least one human player to start the record.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Games" value={stats.human_games_played} />
              <StatCard label="Banks" value={stats.total_banks} />
              <StatCard label="Croaks" value={stats.total_croaks} />
              <StatCard
                label="Best Run"
                value={stats.longest_successful_run}
              />
            </section>

            <section>
              <h2 className="text-xl font-bold">Player Totals</h2>
              <div className="mt-3 overflow-x-auto rounded border border-base-300">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Games</th>
                      <th>Wins</th>
                      <th>Banks</th>
                      <th>Croaks</th>
                      <th>Best Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.player_totals.map((player) => (
                      <tr key={player.player_name}>
                        <td className="font-semibold">{player.player_name}</td>
                        <td>{player.games_played}</td>
                        <td>{player.wins}</td>
                        <td>{player.banks}</td>
                        <td>{player.croaks}</td>
                        <td>{player.longest_successful_run}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Favorite Columns</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {topColumns.length > 0 ? (
                  topColumns.map(({ column, wins }) => (
                    <div
                      key={column}
                      className="rounded border border-base-300 px-3 py-2"
                    >
                      <span className="text-sm opacity-70">Column </span>
                      <span className="text-lg font-bold">{column}</span>
                      <span className="ml-2 text-sm opacity-70">
                        {wins} won
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm opacity-75">No won columns yet.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Achievements</h2>
              <div className="mt-3 flex flex-col gap-2">
                {achievements.length > 0 ? (
                  achievements.map((achievement) => (
                    <article
                      key={`${achievementId(achievement)}-${achievement.player_name}-${achievement.achieved_at_ms}`}
                      className="rounded border border-accent/40 bg-accent/10 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{achievement.title}</h3>
                          <p className="mt-1 text-sm opacity-85">
                            {achievement.message}
                          </p>
                          <p className="mt-1 text-xs opacity-70">
                            Achieved by {achievement.player_name}
                          </p>
                        </div>
                        <time className="shrink-0 text-xs opacity-70">
                          {formatDate(achievement.achieved_at_ms)}
                        </time>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded border border-base-300 p-4 text-sm opacity-75">
                    No achievements yet. The pond is watching.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">Available Achievements</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ACHIEVEMENT_CATALOG.map((achievement) => {
                  const earned = earnedAchievementIds.has(achievement.id);

                  return (
                    <article
                      key={achievement.id}
                      className="rounded border border-base-300 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold">{achievement.title}</h3>
                          <p className="mt-1 text-sm opacity-75">
                            {achievement.description}
                          </p>
                        </div>
                        <span
                          className={
                            earned
                              ? "badge badge-success"
                              : "badge badge-ghost"
                          }
                        >
                          {earned ? "Earned" : "Locked"}
                        </span>
                      </div>
                    </article>
                  );
                })}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleResetAchievements}
                  disabled={!stats || stats.achievements.length === 0}
                >
                  Reset Achievements
                </button>
              </div>
            </section>
          </>
        )}
      </div>
      <ConfirmationDialog
        isOpen={isResetConfirmationOpen}
        message="Reset earned achievements on this device? Career totals will stay."
        onConfirm={confirmResetAchievements}
        onCancel={() => setIsResetConfirmationOpen(false)}
      />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-base-300 p-3 text-center">
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function achievementId(achievement: {
  kind: AchievementKind;
  title: string;
}) {
  return achievement.kind === "ColumnToppedMilestone"
    ? achievement.title
    : achievement.kind;
}

function ConfirmationDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Reset Achievements?"
      actions={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={onConfirm}>
            Reset
          </button>
        </>
      }
    >
      <p className="text-center text-sm opacity-80">{message}</p>
    </Modal>
  );
}
