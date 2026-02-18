import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { CCCEngine, CCCLiveInfo } from "../types";
import { EngineLogo } from "./EngineLogo";
import { Board, type BoardHandle } from "../components/Board";
import "./EngineCard.css";
import { SkeletonBlock, SkeletonText } from "./Loading";
import { MoveList } from "./MoveList";
import { buildPvGame, findPvDisagreementPoint, normalizePv } from "../utils";
import { Chess960 } from "../chess.js/chess";

type EngineCardProps = {
  info?: CCCLiveInfo;
  engine?: CCCEngine;
  time: number;
  placeholder?: string;
  fen: string | undefined;
  opponentInfo?: CCCLiveInfo;
};

export function formatLargeNumber(value?: string) {
  if (!value) return "-";
  const x = Number(value);
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

export function EngineCard({
  engine,
  info,
  time,
  placeholder,
  fen,
  opponentInfo,
}: EngineCardProps) {
  const data = info?.info;
  const loading = !data || !engine || !info || !time;

  const pvMoveNumber = useRef(-1);
  const game = useRef(new Chess960());
  const boardHandle = useRef<BoardHandle>(null);

  function updateBoard() {
    boardHandle.current?.updateBoard(
      game.current,
      pvMoveNumber.current,
      [],
      [],
      []
    );
  }

  const setPvMoveNumber = useCallback(
    (moveNumber: number) => {
      pvMoveNumber.current = moveNumber;
      updateBoard();
    },
    [game.current.moves().length]
  );

  const [pvGame, setPvGame] = useState<ReturnType<typeof buildPvGame> | null>(
    null
  );

  const lastAppliedRef = useRef<{ fen: string; pv: string } | null>(null);

  const pvDisagreementPoint = useMemo(() => {
    return findPvDisagreementPoint(info, opponentInfo, fen);
  }, [info, opponentInfo, fen]);

  useEffect(() => {
    if (loading || !fen || !data?.pv || !data?.color) return;

    const normalizedPv = normalizePv(data.pv, data.color, fen);
    if (!normalizedPv) return;

    if (lastAppliedRef.current && lastAppliedRef.current.fen === fen) {
      return;
    }

    const game = buildPvGame(fen, normalizedPv, -1);
    if (game.history().length === 0) return;

    lastAppliedRef.current = { fen, pv: normalizedPv };
    setPvMoveNumber(-1);
    setPvGame(game);
  }, [loading, data?.pv, data?.color, fen]);

  useEffect(() => {
    if (!pvGame) return;

    game.current = pvGame;

    pvMoveNumber.current = -1;

    boardHandle.current?.updateBoard(
      game.current,
      pvMoveNumber.current,
      [],
      [],
      []
    );
  }, [pvGame]);

  const fields = loading
    ? ["Time", "Depth", "Nodes", "NPS", "TB Hits", "Hashfull"].map((label) => [
        label,
        null,
      ])
    : [
        ["Time", formatTime(time)],
        ["Depth", `${data.depth} / ${data.seldepth ?? "-"}`],
        ["Nodes", formatLargeNumber(data.nodes)],
        ["NPS", formatLargeNumber(data.speed)],
        ["TB Hits", data.tbhits ?? "-"],
        ["Hashfull", data.hashfull ?? "-"],
      ];

  return (
    <div className={`engineComponent ${loading ? "loading" : ""}`}>
      <div className="engineLeftSection">
        <div className="engineInfoHeader">
          {loading ? (
            <SkeletonBlock width={36} height={36} style={{ margin: 6 }} />
          ) : (
            <EngineLogo engine={engine!} />
          )}

          <div className="engineName">
            {loading ? (placeholder ?? "Loading…") : engine!.name}
          </div>
        </div>

        <div className="engineInfoTable">
          {loading ? (
            <SkeletonText width="100%" />
          ) : (
            <div className="engineField">
              <div className="key">Evaluation</div>
              <div className="value engineEval">{data.score}</div>
            </div>
          )}

          {fields.map(([label, value]) => (
            <div className="engineField" key={label}>
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
      </div>

      {loading ? (
        <SkeletonText width="100%" />
      ) : pvGame ? (
        <>
          <Board ref={boardHandle} />

          <MoveList
            game={pvGame}
            currentMoveNumber={pvMoveNumber.current}
            setCurrentMoveNumber={setPvMoveNumber}
            controllers={false}
            disagreementMoveIndex={
              pvDisagreementPoint !== -1 ? pvDisagreementPoint : undefined
            }
          />
        </>
      ) : null}
    </div>
  );
}
