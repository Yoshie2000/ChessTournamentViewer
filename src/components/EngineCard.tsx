import { useMemo, useRef, useCallback, memo, useEffect } from "react";
import type { CCCEngine, CCCLiveInfo } from "../types";
import { EngineLogo } from "./EngineLogo";
import { Board, type BoardHandle } from "../components/Board";
import "./EngineCard.css";
import { SkeletonBlock, SkeletonText } from "./Loading";
import { MoveList } from "./MoveList";
import { buildPvGame, findPvDisagreementPoint, normalizePv } from "../utils";
import { Chess, Chess960 } from "../chess.js/chess";
import { useMediaQuery } from "react-responsive";

type EngineCardProps = {
  info?: CCCLiveInfo;
  engine?: CCCEngine;
  time: number;
  placeholder?: string;
  fen: string | undefined;
  opponentInfo?: CCCLiveInfo;
  kibitzerLayout?: boolean;
};

export function formatLargeNumber(value?: string) {
  if (!value) return "-";
  const x = Number(value);
  if (isNaN(x)) return "-";
  if (x >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (x >= 1_000) return (x / 1_000).toFixed(2) + "K";
  return String(x);
}

export function formatTime(time: number) {
  if (time < 0) time = 0;
  const hundreds = String(Math.floor(time / 100) % 10).padEnd(2, "0");
  const seconds = String(Math.floor(time / 1000) % 60).padStart(2, "0");
  const minutes = String(Math.floor(time / (1000 * 60)) % 60).padStart(2, "0");
  return `${minutes}:${seconds}.${hundreds}`;
}

const EngineCard = memo(
  ({ engine, info, time, placeholder, fen, opponentInfo, kibitzerLayout }: EngineCardProps) => {
    const data = info?.info;
    const loading = !data || !engine || !info || !time;

    const pvMoveNumber = useRef(-1);
    const game = useRef(new Chess960());
    const boardHandle = useRef<BoardHandle>(null);

    function updateBoard() {
      boardHandle.current?.updateBoard(game.current, pvMoveNumber.current);
    }

    const pvDisagreementPoint = useMemo(() => {
      return findPvDisagreementPoint(fen, info, opponentInfo);
    }, [info, opponentInfo, fen]);

    const moves = useMemo(() => {
      if (loading || !fen || !data?.color) return undefined;

      pvMoveNumber.current = -1;
      return normalizePv(data.pvSan, data.color, fen);
    }, [loading, data?.pvSan, data?.color, fen]);

    useEffect(() => {
      if (!fen || !moves) return;

      // Throttle the actual update slightly to not destroy react render times
      const timeout = setTimeout(() => {
        game.current = buildPvGame(fen, moves, -1);
        updateBoard();
      }, 10);

      return () => clearTimeout(timeout);
    }, [moves]);

    const setPvMoveNumber = useCallback((callback: ((previous: number) => number)) => {
        pvMoveNumber.current = callback(pvMoveNumber.current);
        updateBoard();
      },
      [moves, fen]
    );

    const fields = loading
      ? ["Time", "Depth", "Nodes", "NPS", "TB Hits", "Hashfull"].map(
          (label) => [label, null]
        )
      : [
          ["Time", formatTime(time)],
          ["Depth", `${data.depth} / ${data.seldepth ?? "-"}`],
          ["Nodes", formatLargeNumber(data.nodes)],
          ["NPS", formatLargeNumber(data.speed)],
          ["TB Hits", formatLargeNumber(data.tbhits) ?? "-"],
          ["Hashfull", data.hashfull ?? "-"],
        ];

    const isMobile = useMediaQuery({ maxWidth: 1400 });

    const safeFen = fen ?? new Chess().fen();
    const moveNumberOffset = new Chess960(safeFen).moveNumber() - 1;

    return (
      <div className={`engineComponent ${loading ? "loading" : ""} ${kibitzerLayout ? "kibitzer" : ""}`}>
        <div className="engineLeftSection">
          <div className="engineInfoHeader">
            {!engine ? (
              <SkeletonBlock width={36} height={36} style={{ margin: 6 }} />
            ) : (
              <EngineLogo engine={engine!} />
            )}

            <div className="engineName">
              {!engine ? (placeholder ?? "Loading…") : engine!.name}
            </div>
          </div>

          <hr />

          <div className="engineInfoTable">
            {fields.map(([label, value]) => (
              <div className={"engineField " + label?.replace(" ", "").toLowerCase()} key={label}>
                {loading ? (
                  <SkeletonText width="100%" />
                ) : (
                  <>
                    <div className="key">{label}</div>
                    <div className="value">{value}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          <hr />

          <div className="engineInfoEval">
            {loading ? (
              <SkeletonText width="100%" />
            ) : (
              <div className="engineEval">{data.score}</div>
            )}
          </div>
        </div>

        {loading && !isMobile ? (
          <SkeletonBlock
            width="100%"
            height="calc(100% - 2 * var(--padding))"
            style={{ margin: "var(--padding) var(--padding) var(--padding) 0" }}
          />
        ) : moves && !isMobile ? (
          <div className="engineRightSection">
            <Board ref={boardHandle} animated={false} />

            <MoveList
              startFen={safeFen}
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
        ) : null}
      </div>
    );
  }
);

export { EngineCard };
