import { useEffect, useState } from "react";
import { getGameStatistics, startGame, stopGame } from "services/ipc";
import { GameState, PlayerColors, StatsSummary } from "types";

type GameOverModalProps = {
  gameState: GameState;
};

const GameOverModal: React.FC<GameOverModalProps> = ({ gameState }) => {
  if (!gameState.winner) {
    return null; // Don't render the modal if there's no winner
  }
  const winnerName = gameState.winner.name;
  const winnerColor = PlayerColors[gameState.winner.id - 1];
  const [stats, setStats] = useState<StatsSummary>();

  useEffect(() => {
    getGameStatistics().then((stats) => {
      setStats(stats);
      alert(JSON.stringify(stats));
    });
  }, []);

  return (
    <dialog id="game-over" className="modal modal-open">
      <div
        className="modal-box flex justify-center flex-col items-center"
        style={{
          borderColor: winnerColor,
          borderWidth: "2px",
          borderStyle: "solid",
        }}
      >
        <h3 className="font-bold text-xl" style={{ color: winnerColor }}>
          {winnerName} Wins!
        </h3>
        <div className="divider">Game Stats</div>
        <div className="overflow-y-auto">
          <div className="stats stats-horizontal shadow my-4">
            <div className="stat place-items-center">
              <div className="stat-title">Most Contested Column</div>
              <div className="stat-value">
                {stats?.most_contested_column ?? "..."}
              </div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Total Turns</div>
              <div className="stat-value">{stats?.total_turns ?? "..."}</div>
            </div>
          </div>
          <div className="w-full">
            {stats?.player_stats.map((playerStat, index) => (
              <>
                <h3>
                  <span
                    style={{ color: PlayerColors[index], fontWeight: "bold" }}
                  >
                    {gameState.settings.players[index].name}
                  </span>
                </h3>
                <table className="table table-zebra w-full">
                  <thead>
                    <tr></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Longest Run</td> <td>{playerStat.longest_run}</td>
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
              </>
            ))}
          </div>
        </div>
        <div className="modal-action flex justify-center">
          <button
            className="btn"
            onClick={async () => {
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
