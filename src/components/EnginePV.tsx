import { useRef, useMemo, useCallback, useEffect } from "react";
import { Chess960 } from "../chess.js/chess";
import type { LiveEngineDataEntryObject } from "../LiveInfo";
import { normalizePv, buildPvGame } from "../utils";
import { type BoardHandle, Board } from "./Board";
import { SkeletonBlock } from "./Loading";
import { MoveList } from "./MoveList";
import "./EnginePV.css";

type EnginePVProps = {
  liveInfoData: LiveEngineDataEntryObject;
  fen: string;
  pvDisagreementPoint: number;
};

export function EnginePV({
  liveInfoData,
  fen,
  pvDisagreementPoint,
}: EnginePVProps) {
  const data = liveInfoData.liveInfo?.info;

  const boardHandle = useRef<BoardHandle>(null);
  const pvMoveNumber = useRef(-1);
  const game = useRef(new Chess960());

  const moves = useMemo(() => {
    if (!data?.color) return undefined;

    pvMoveNumber.current = -1;
    return normalizePv(data.pvSan, data.color, fen);
  }, [data?.pvSan, data?.color, fen]);

  function updateBoard() {
    boardHandle.current?.updateBoard(game.current, pvMoveNumber.current);
  }

  const setPvMoveNumber = useCallback(
    (callback: (previous: number) => number) => {
      pvMoveNumber.current = callback(pvMoveNumber.current);
      updateBoard();
    },
    [moves, fen]
  );

  useEffect(() => {
    if (!fen || !moves) return;

    // Throttle the actual update slightly to not destroy react render times
    const timeout = setTimeout(() => {
      game.current = buildPvGame(fen, moves, -1);
      updateBoard();
    }, 10);

    return () => clearTimeout(timeout);
  }, [moves, boardHandle.current]);

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
      <Board ref={boardHandle} animated={false} />

      <MoveList
        startFen={fen}
        moves={moves}
        currentMoveNumber={pvMoveNumber.current}
        setCurrentMoveNumber={setPvMoveNumber}
        controllers={false}
        disagreementMoveIndex={
          pvDisagreementPoint !== -1 ? pvDisagreementPoint : undefined
        }
        moveNumberOffset={moveNumberOffset}
      />
    </div>
  );
}
