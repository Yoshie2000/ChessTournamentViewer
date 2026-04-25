import { Chess960 } from "./chess.js/chess";
import { movesToSan, movesToLan } from "labut";
import type { CCCLiveInfo } from "./types";

export function uciToSan(fen: string, moves: string[]): string[] {
  const result = movesToSan(fen, moves).moves.map((m) => m.san);
  if (result.length !== moves.length) {
    console.warn(
      "uciToSan() produced mismatching pv lengths",
      fen,
      moves,
      result
    );
  }
  return result;
}

export function sanToUci(fen: string, moves: string[]): string[] {
  const result = movesToLan(fen, moves).moves.map((m) => m.lan);
  if (result.length !== moves.length) {
    // TODO uncomment this later
    // console.warn(
    //   "sanToUci() produced mismatching pv lengths",
    //   fen,
    //   moves,
    //   result
    // );
  }
  return result;
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
