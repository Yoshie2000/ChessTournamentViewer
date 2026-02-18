import { useEffect, useState } from "react";
import "./GameResultOverlay.css";

type GameResultOverlayProps = { result: string; termination: string };

export function GameResultOverlay({
  result,
  termination,
}: GameResultOverlayProps) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const board = document.getElementById("main-board");
    if (!board) return;

    const updatePosition = () => {
      const rect = board.getBoundingClientRect();
      if (rect.width && rect.height) {
        setStyle({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
        setReady(true);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, []);

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

  if (!ready) return null;

  return (
    <div
      className="gameResultOverlay"
      style={{
        position: "absolute",
        top: style.top,
        left: style.left,
        width: style.width,
        height: style.height,
      }}
    >
      <div className="result">{result}</div>
      <div className="termination">{getTerminationString()}</div>
    </div>
  );
}
