import { Chess960 } from "./chess.js/chess";
import type { CCCLiveInfo } from "./types";
import ChessModule from "./chess.js/chess_api";

export const Module = await ChessModule();
Module.initChess();

let game = new Module.ChessGame("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", /*chess960=*/true);

export function uciToSan(fen: string, san: string | string[]): string[] {
  game.reset(fen, /*chess960=*/ true);
  if (Array.isArray(san)) {
    san = san.join(" ");
  }

  const err = game.playMoves(san, false);
  if (err) {
    throw new Error("uciToSan: " + game.getErr());
  }

  return game.getSanMovesString().split(" ");
}

export function sanToUci(fen: string, moves: string[]): string[] {
  game.reset(fen, true)

  game.playMoves(moves.join(" "), true);

  return game.getSanMovesString().split(" ");
}

export function buildPvGame(
  fen: string,
  moves: string[],
  pvMoveNumber: number
) {
  const game = new Chess960(fen);

  for (let i = 0; i < moves.length; i++) {
    if (pvMoveNumber !== -1 && i > pvMoveNumber) {
      break;
    }

    const san = moves[i];
    if (!san) break;

    try {
      const result = game.move(san, { strict: false });

      if (!result) {
        break;
      }
    } catch {
      break;
    }
  }

  return game;
}

// Normalize a PV so it always starts from the current position (fen's turn).
// If it's not this engine's turn, its PV starts with its own last move,
// so we strip that first move to align both PVs to the same position.
export function normalizePv(
  pv: string,
  engineColor: string,
  fen: string
): string[] {
  const turn = fen.split(" ")[1];
  const turnColor = turn === "w" ? "white" : "black";
  const moves = pv.trim().split(/\s+/);
  if (
    engineColor !== turnColor &&
    !["red", "blue", "green"].includes(engineColor)
  ) {
    return moves.slice(1);
  }
  return moves;
}

export function findPvDisagreementPoint(
  fen: string | undefined,
  ...infos: (CCCLiveInfo | undefined)[]
): number | undefined {
  if (!fen || infos.length < 2) return undefined;

  // Normalize all PVs to start from the current position, then compare directly
  const allMoves = infos
    .map((item) => {
      const data = item?.info;
      if (!data?.pv || !data?.color) return null;
      return normalizePv(data.pv, data.color, fen).filter(Boolean);
    })
    .filter((moves) => moves !== null);

  if (allMoves.length < 2) return undefined;

  const minLength = Math.min(...allMoves.map((m) => m.length));

  for (let i = 0; i < minLength; i++) {
    const firstEngineMove = allMoves[0][i];

    const allAgree = allMoves.every(
      (moveList) => moveList[i] === firstEngineMove
    );

    if (!allAgree) {
      return i;
    }
  }

  return minLength;
}
