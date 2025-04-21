import { GameState, PlayerColors } from "types";

type GameOverModalProps = {
  gameState: GameState;
};

const GameOverModal: React.FC<GameOverModalProps> = ({ gameState }) => {
  if (!gameState.winner) {
    return null; // Don't render the modal if there's no winner
  }
  const winnerName = gameState.winner.name;
  const winnerColor = PlayerColors[gameState.winner.id];

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
        <div className="modal-action flex justify-center">
          <button className="btn" onClick={() => (window.location.href = "/")}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default GameOverModal;
