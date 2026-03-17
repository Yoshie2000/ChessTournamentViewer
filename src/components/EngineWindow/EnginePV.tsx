import { useState } from "react";
import { Chess960 } from "../../chess.js/chess";
import type { LiveEngineDataEntry } from "../../LiveInfo";
import { normalizePv, buildPvGame } from "../../utils";
import { SkeletonBlock } from "../Loading";
import { MoveList } from "../MoveList";
import "./EnginePV.css";
import { useKibitzerBoard } from "../../hooks/BoardHook";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { shallow } from "zustand/shallow";
import { useInterval } from "../../hooks/useInterval";

type EnginePVProps = { color: keyof LiveEngineDataEntry };

export function EnginePV({ color }: EnginePVProps) {
  const {
    Board,
    currentMoveNumber,
    game,
    setCurrentFen,
    setCurrentMoveNumber,
  } = useKibitzerBoard({ animated: false });

  const state = useLiveInfo.getState();
  const [fen, setFen] = useState(state.currentFen);
  const [moves, setMoves] = useState<string[]>();
  const [pvDisagreementPoint, setPvDisagreementPoint] = useState<number>();

  useInterval((state) => {
    // Update the FEN
    setFen(state.currentFen);
    const disagreementList = ["white", "black"].includes(color)
      ? state.engineAgreePly
      : state.kibitzerAgreePly;
    setPvDisagreementPoint(disagreementList.at(state.currentMoveNumber));

    const data = state.liveInfos[color].liveInfo?.info;
    if (!data) return;

    // If the PV is different, re-build the game & re-render it
    const moves = normalizePv(data.pvSan, data.color, fen);
    setMoves((previous) => {
      if (shallow(moves, previous)) return previous;

      setCurrentMoveNumber(-1);
      game.current = buildPvGame(fen, moves, -1);
      setCurrentFen(game.current.fen());
      return moves;
    });
  });

  const moveNumberOffset = new Chess960(fen).moveNumber() - 1;

  if (!moves) {
    return (
      <SkeletonBlock
        width="100%"
        height="calc(100% - 2 * var(--padding))"
        style={{ margin: "var(--padding) var(--padding) var(--padding) 0" }}
      />
    );
  }

  return (
    <div className="enginePV">
      {Board}

      <MoveList
        startFen={fen}
        moves={moves}
        currentMoveNumber={currentMoveNumber}
        setCurrentMoveNumber={setCurrentMoveNumber}
        controllers={false}
        disagreementMoveIndex={
          pvDisagreementPoint !== -1 ? pvDisagreementPoint : undefined
        }
        moveNumberOffset={moveNumberOffset}
      />
    </div>
  );
}
