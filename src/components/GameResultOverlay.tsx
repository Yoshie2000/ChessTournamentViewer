import { useLiveInfo } from "../context/LiveInfoContext";
import "./GameResultOverlay.css";

type GameResultOverlayProps = { result: string; termination: string };

export function GameResultOverlay({
  result,
  termination,
}: GameResultOverlayProps) {
  const currentMoveNumber = useLiveInfo((state) => state.currentMoveNumber);
  const game = useLiveInfo((state) => state.game);

  function getTerminationString() {
    switch (termination.toLowerCase()) {
      case "drawsyzygy":
        return "Syzygy Adjudication";
      case "drawadj":
        return "Draw Adjudication";
      case "draw50move":
        return "50 Move Rule";
      case "whitestall":
        return "White stalls";
      case "blackstall":
        return "Black stalls";
      case "draw3fold":
        return "Threefold Repetition";
      case "whitemates":
        return "White mates";
      case "blackmates":
        return "Black mates";
      case "adjudication":
        if (result === "1/2-1/2") return "Draw Adjudication";
        else return "Adjudication";
      default:
        return termination;
    }
  }

  return (
    (currentMoveNumber === -1 || currentMoveNumber === game.length()) && (
      <div className="gameResultOverlay">
        <div className="result">{result}</div>
        <div className="termination">{getTerminationString()}</div>
      </div>
    )
  );
}
