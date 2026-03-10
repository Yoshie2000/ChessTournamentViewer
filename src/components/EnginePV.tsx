import { useMemo, useEffect } from "react";
import { Chess960 } from "../chess.js/chess";
import type { LiveEngineDataEntryObject } from "../LiveInfo";
import { normalizePv, buildPvGame } from "../utils";
import { SkeletonBlock } from "./Loading";
import { MoveList } from "./MoveList";
import "./EnginePV.css";
import { useKibitzerBoard } from "../hooks/BoardHook";
import { useLiveInfo } from "../context/LiveInfoContext";

type EnginePVProps = {
  liveInfoData: LiveEngineDataEntryObject;
  pvDisagreementPoint: number;
};

export function EnginePV({ liveInfoData, pvDisagreementPoint }: EnginePVProps) {
  const data = liveInfoData.liveInfo?.info;

  const {
    Board,
    currentMoveNumber,
    game,
    setCurrentFen,
    setCurrentMoveNumber,
  } = useKibitzerBoard({ animated: false });

  const fen = useLiveInfo((state) => state.game.fenAt(state.currentMoveNumber));

  const moves = useMemo(() => {
    if (!data?.color) return undefined;

    setCurrentMoveNumber(-1);
    return normalizePv(data.pvSan, data.color, fen);
  }, [data?.pvSan, data?.color, fen]);

  useEffect(() => {
    if (!fen || !moves) return;

    game.current = buildPvGame(fen, moves, -1);
    setCurrentFen(game.current.fen());
  }, [moves]);

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
