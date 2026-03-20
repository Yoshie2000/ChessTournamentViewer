import { useState } from "react";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import "./GameResultOverlay.css";
import { useInterval } from "../../hooks/useInterval";
import { useShallow } from "zustand/shallow";

export function GameResultOverlay() {
  const [_, setCurrentFen] = useState<string>();
  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);

  useInterval((state) => {
    setCurrentFen(state.currentFen);
    setCurrentMoveNumber(state.currentMoveNumber);
  });

  const activeGame = useEventStore((state) => state.activeGame);
  const game = useLiveInfo.getState().game;

  const { termination, result } = useLiveInfo(
    useShallow((state) => {
      const pgnHeaders = state.game.getHeaders();
      const termination =
        activeGame?.gameDetails?.termination ??
        pgnHeaders["Termination"] ??
        pgnHeaders["TerminationDetails"] ??
        "";
      const result = pgnHeaders["Result"];

      return { termination, result };
    })
  );

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
      case "blackdc":
        return "Black disconnects";
      case "whitedc":
        return "White disconnects";
      case "blackillegal":
        return "Black makes illegal move";
      case "whiteillegal":
        return "White makes illegal move";
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
