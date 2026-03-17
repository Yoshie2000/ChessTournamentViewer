import { useState } from "react";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import "./GameResultOverlay.css";
import { useInterval } from "../../hooks/useInterval";

export function GameResultOverlay() {
  const [_, setCurrentFen] = useState<string>();
  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);

  useInterval((state) => {
    setCurrentFen(state.currentFen);
    setCurrentMoveNumber(state.currentMoveNumber);
  });

  const cccGame = useEventStore((state) => state.cccGame);
  const game = useLiveInfo.getState().game;

  const pgnHeaders = game.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"] ??
    "";
  const result = pgnHeaders["Result"];

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
      case "abandoned":
        if (result === "1-0") return "Black crashed";
        if (result === "0-1") return "White crashed";
        return termination;
      default:
        return termination;
    }
  }

  return (
    termination &&
    result &&
    result !== "*" &&
    (currentMoveNumber === -1 || currentMoveNumber === game.length()) && (
      <div className="gameResultOverlay">
        <div className="result">{result}</div>
        <div className="termination">{getTerminationString()}</div>
      </div>
    )
  );
}
