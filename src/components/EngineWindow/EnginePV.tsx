import { useState } from "react";
import { Chess960 } from "../../chess.js/chess";
import type { LiveEngineDataEntry } from "../../LiveInfo";
import { normalizePv, buildPvGame } from "../../utils";
import { SkeletonBlock, SkeletonText } from "../Loading";
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

    // Update disagreement index
    const disagreementList = ["white", "black"].includes(color)
      ? state.engineAgreePly
      : state.kibitzerAgreePly;
    const disagreementListIndex =
      state.currentMoveNumber === -1 &&
      !disagreementList.at(state.currentMoveNumber)
        ? state.currentMoveNumber - 1
        : state.currentMoveNumber;
    setPvDisagreementPoint(disagreementList.at(disagreementListIndex));

    const data = state.liveInfos[color].liveInfo?.info;
    if (!data) return;

    // If the PV is different, re-build the game & re-render it
    const moves = normalizePv(data.pvSan ?? "", color, state.currentFen);
    setMoves((previous) => {
      if (shallow(moves, previous)) return previous;

      setCurrentMoveNumber(-1);
      game.current = buildPvGame(state.currentFen, moves, -1);
      setCurrentFen(game.current.fen());
      return moves;
    });
  });

  const moveNumberOffset = new Chess960(fen).moveNumber() - 1;

  if (!moves) {
    return (
      <div className="enginePV">
        <SkeletonBlock
          width="var(--kibitzer-board-size)"
          height="var(--kibitzer-board-size)"
        />

        <div className="movesWindow">
          <SkeletonText height={16} width="100%" />
          <SkeletonText height={16} width="100%" />
          <SkeletonText height={16} width="100%" />
        </div>
      </div>
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
