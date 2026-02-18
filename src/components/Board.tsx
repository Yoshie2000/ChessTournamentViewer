import { Chessground } from "@lichess-org/chessground";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { LiveInfoEntry } from "./LiveInfo";
import { getGameAtMoveNumber } from "./MoveList";
import type { Chess960, Square } from "../chess.js/chess";
import "./Board.css";

const BOARD_THROTTLE_MS = 50;

export type BoardHandle = {
  updateBoard: (
    game: Chess960,
    currentMoveNumber: number,
    liveInfosWhite?: LiveInfoEntry,
    liveInfosBlack?: LiveInfoEntry,
    liveInfosKibitzer?: LiveInfoEntry,
    bypassRateLimit?: boolean
  ) => void;
};

export const Board = forwardRef<BoardHandle, { id?: string }>((props, ref) => {
  const boardElementRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Api>(null);
  const lastBoardUpdateRef = useRef(new Date().getTime());

  useEffect(() => {
    if (boardRef.current || !boardElementRef.current) return;
    boardRef.current = Chessground(boardElementRef.current, {
      orientation: "white",
      movable: { free: false, color: undefined, dests: undefined },
      selectable: { enabled: false },
    });
  }, []);

  useImperativeHandle(ref, () => ({
    updateBoard(
      game,
      currentMoveNumber,
      liveInfoWhite,
      liveInfoBlack,
      liveInfoKibitzer,
      bypassRateLimit
    ) {
      if (!boardRef.current) return;

      const currentTime = new Date().getTime();
      if (
        !bypassRateLimit &&
        currentTime - lastBoardUpdateRef.current <= BOARD_THROTTLE_MS
      )
        return;

      const gameAtTurn = getGameAtMoveNumber(game, currentMoveNumber);
      const fen = gameAtTurn.fen();
      const turn = gameAtTurn.turn();

      const arrows: DrawShape[] = [];

      let moveWhite: string | null = null;
      if (liveInfoWhite) {
        const pv = liveInfoWhite.info.pv.split(" ");
        const nextMove = turn === "w" ? pv[0] : pv[1];
        if (nextMove && nextMove.length >= 4) {
          moveWhite = nextMove;
          arrows.push({
            orig: (nextMove.slice(0, 2) as Square) || "a1",
            dest: (nextMove.slice(2, 4) as Square) || "a1",
            brush: liveInfoWhite.info.color,
          });
        }
      }

      if (liveInfoBlack) {
        const pv = liveInfoBlack.info.pv.split(" ");
        const nextMove = turn === "b" ? pv[0] : pv[1];
        if (nextMove && nextMove === moveWhite) {
          arrows[0].brush = "agree";
        } else if (nextMove && nextMove.length >= 4) {
          arrows.push({
            orig: (nextMove.slice(0, 2) as Square) || "a1",
            dest: (nextMove.slice(2, 4) as Square) || "a1",
            brush: liveInfoBlack.info.color,
          });
        }
      }

      if (liveInfoKibitzer) {
        const pv = liveInfoKibitzer.info.pv.split(" ");
        const nextMove = pv[0];
        if (nextMove && nextMove.length >= 4) {
          arrows.push({
            orig: (nextMove.slice(0, 2) as Square) || "a1",
            dest: (nextMove.slice(2, 4) as Square) || "a1",
            brush: "kibitzer",
          });
        }
      }

      const history = game.history({ verbose: true });
      const lastMove =
        currentMoveNumber === -1
          ? history.at(-1)
          : history.at(currentMoveNumber - 1);

      const config: Config = {
        drawable: {
          // @ts-ignore
          brushes: {
            white: { key: "white", color: "#fff", opacity: 1, lineWidth: 10 },
            black: { key: "black", color: "#000", opacity: 1, lineWidth: 10 },
            agree: {
              key: "agree",
              color: "#43a047",
              opacity: 1,
              lineWidth: 10,
            },
            kibitzer: {
              key: "kibitzer",
              color: "#0D47A1",
              opacity: 0.75,
              lineWidth: 5,
            },
          },
          enabled: false,
          eraseOnMovablePieceClick: false,
          shapes: arrows,
        },
        fen,
        ...(lastMove ? { lastMove: [lastMove.from, lastMove.to] } : {}),
      };

      boardRef.current.set(config);
      lastBoardUpdateRef.current = new Date().getTime();
    },
  }));

  return <div ref={boardElementRef} className="board" {...props} />;
});
