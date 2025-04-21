import { GameState } from "types";

type GameOverModalProps = {
  gameState: GameState;
};

const GameOverModal: React.FC<GameOverModalProps> = ({ gameState }) => {
  return (
    <dialog id="game-over" className="modal modal-open">
      <div className="modal-box flex justify-center">
        <h3 className="font-bold text-xl">Winner!</h3>
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
