import { Chessground } from "@lichess-org/chessground";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { LiveEngineDataEntry } from "../LiveInfo";
import type { Chess960, Square } from "../chess.js/chess";
import "./Board.css";

const BOARD_THROTTLE_MS = 50;

export type BoardHandle = {
  updateBoard: (
    game: Chess960,
    currentMoveNumber: number,
    liveInfos?: LiveEngineDataEntry,
    bypassRateLimit?: boolean
  ) => void;
};

type BoardProps = { id?: string; animated: boolean };

export const Board = forwardRef<BoardHandle, BoardProps>((props, ref) => {
  const boardElementRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Api>(null);
  const lastBoardUpdateRef = useRef(new Date().getTime());

  useEffect(() => {
    if (boardRef.current || !boardElementRef.current) return;
    boardRef.current = Chessground(boardElementRef.current, {
      orientation: "white",
      movable: { free: false, color: undefined, dests: undefined },
      selectable: { enabled: false },
      animation: { enabled: props.animated },
    });
  }, []);

  useImperativeHandle(ref, () => ({
    updateBoard(game, currentMoveNumber, liveInfos, bypassRateLimit) {
      if (!boardRef.current) return;

      const currentTime = new Date().getTime();
      if (
        !bypassRateLimit &&
        currentTime - lastBoardUpdateRef.current <= BOARD_THROTTLE_MS
      )
        return;

      const fen = game.fenAt(currentMoveNumber);
      const turn = game.turnAt(currentMoveNumber);
      const lastMove = game.moveAt(currentMoveNumber);

      const arrows: DrawShape[] = [];

      let moveWhite: string | null = null;
      if (liveInfos?.white.liveInfo) {
        const pv = liveInfos.white.liveInfo.info.pv.split(" ");
        const nextMove = turn === "w" ? pv[0] : pv[1];
        if (nextMove && nextMove.length >= 4) {
          moveWhite = nextMove;
          arrows.push({
            orig: (nextMove.slice(0, 2) as Square) || "a1",
            dest: (nextMove.slice(2, 4) as Square) || "a1",
            brush: liveInfos.white.liveInfo.info.color,
          });
        }
      }

      if (liveInfos?.black.liveInfo) {
        const pv = liveInfos.black.liveInfo.info.pv.split(" ");
        const nextMove = turn === "b" ? pv[0] : pv[1];
        if (nextMove && nextMove === moveWhite) {
          arrows[0].brush = "agree";
        } else if (nextMove && nextMove.length >= 4) {
          arrows.push({
            orig: (nextMove.slice(0, 2) as Square) || "a1",
            dest: (nextMove.slice(2, 4) as Square) || "a1",
            brush: liveInfos.black.liveInfo.info.color,
          });
        }
      }

      for (const color of ["green", "red", "blue"] as const) {
        if (liveInfos?.[color].liveInfo) {
          const pv = liveInfos[color].liveInfo.info.pv.split(" ");
          const nextMove = pv[0];
          if (nextMove && nextMove.length >= 4) {
            arrows.push({
              orig: (nextMove.slice(0, 2) as Square) || "a1",
              dest: (nextMove.slice(2, 4) as Square) || "a1",
              brush: color,
            });
          }
        }
      }

      const config: Config = {
        drawable: {
          // @ts-ignore
          brushes: {
            white: { key: "white", color: "#fff", opacity: 1, lineWidth: 10 },
            black: { key: "black", color: "#000", opacity: 1, lineWidth: 10 },
            agree: {
              key: "agree",
              color: "#c548c5",
              opacity: 1,
              lineWidth: 10,
            },
            red: { key: "red", color: "#ff1f1f", opacity: 0.75, lineWidth: 4, },
            blue: {
              key: "blue",
              color: "#0D47A1",
              opacity: 0.75,
              lineWidth: 4,
            },
            green: {
              key: "green",
              color: "#17a01d",
              opacity: 0.75,
              lineWidth: 7,
            },
          },
          enabled: false,
          eraseOnMovablePieceClick: false,
          shapes: arrows,
        },
        fen,
        ...(lastMove
          ? { lastMove: [lastMove.from, lastMove.to] }
          : { lastMove: [] }),
      };

      requestAnimationFrame(() => {
        boardRef.current?.set(config);
      });
      lastBoardUpdateRef.current = new Date().getTime();
    },
  }));

  return <div ref={boardElementRef} className="board" {...props} />;
});
