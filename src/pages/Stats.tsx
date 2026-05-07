import { useEffect, useMemo, useState } from "react";
import { getCareerStatistics, resetAchievements } from "services/ipc";
import { AchievementKind, CareerStats } from "types";

const ACHIEVEMENT_CATALOG: {
  kind: AchievementKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "ThreeHopHero",
    title: "Three-Hop Hero",
    description: "Bank a run of 3 or more hops.",
  },
  {
    kind: "StillStanding",
    title: "Still Standing",
    description: "Survive a high-risk roll.",
  },
  {
    kind: "NoSplash",
    title: "No Splash",
    description: "Win with one croak or fewer.",
  },
  {
    kind: "LeapOfFaith",
    title: "Leap of Faith",
    description: "Win after taking above-average risk.",
  },
  {
    kind: "CloseCall",
    title: "Close Call",
    description: "Lose despite statistically lucky rolls.",
  },
  {
    kind: "Shutout",
    title: "Clean Sweep",
    description: "Win before any opponent scores a column.",
  },
  {
    kind: "SnatchedAtTheTop",
    title: "Snatched at the Top",
    description: "Win a column when an opponent is one hop away.",
  },
  {
    kind: "Bookends",
    title: "Bookends",
    description: "Win both columns 2 and 12 in the same game.",
  },
  {
    kind: "AgainstTheOdds",
    title: "Against the Odds",
    description:
      "Win with unlucky rolls while an opponent had statistically lucky rolls.",
  },
  {
    kind: "CenterPerch",
    title: "Center Perch",
    description: "Win column 7.",
  },
  {
    kind: "HighWireWin",
    title: "High-Wire Win",
    description: "Win while carrying very high average risk.",
  },
  {
    kind: "FiveHopFlex",
    title: "Five-Hop Flex",
    description: "Bank a run of 5 or more hops.",
  },
  {
    kind: "SevenHopShowoff",
    title: "Seven-Hop Showoff",
    description: "Bank a run of 7 or more hops.",
  },
  {
    kind: "PerfectLanding",
    title: "Perfect Landing",
    description: "Win without croaking once.",
  },
  {
    kind: "ComebackCroaker",
    title: "Comeback Croaker",
    description: "Win after croaking at least twice.",
  },
  {
    kind: "Bankroll",
    title: "Bankroll",
    description: "Bank at least 5 runs in one game.",
  },
  {
    kind: "TripleCrown",
    title: "Triple Crown",
    description: "Win 3 or more columns in one game.",
  },
  ...([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((column) => ({
    kind: `FirstUp${column}` as AchievementKind,
    title: `First Up ${column}`,
    description: `Be first to the top of column ${column}.`,
  })),
];

export function StatsPage() {
  const [stats, setStats] = useState<CareerStats>();

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
  const earnedAchievementKinds = new Set(
    stats?.achievements.map((achievement) => achievement.kind) ?? []
  );

  async function handleResetAchievements() {
    const confirmed = window.confirm(
      "Reset earned achievements on this device? Career totals will stay."
    );
    if (!confirmed) return;
    const nextStats = await resetAchievements();
    setStats(nextStats);
  }

  return (
    <main className="h-dvh overflow-y-auto px-5 py-6 pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Statistics</h1>
              <p className="mt-1 text-sm opacity-75">
                Device-wide totals for human players on this device.
              </p>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleResetAchievements}
              disabled={!stats || stats.achievements.length === 0}
            >
              Reset Achievements
            </button>
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
                      key={`${achievement.kind}-${achievement.player_name}-${achievement.achieved_at_ms}`}
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
                  const earned = earnedAchievementKinds.has(achievement.kind);

                  return (
                    <article
                      key={achievement.kind}
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
              </div>
            </section>
          </>
        )}
      </div>
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
