import { Chess960 } from "./chess.js/chess";
import type { CCCLiveInfo } from "./types";

export function buildPvGame(fen: string, pv: string, pvMoveNumber: number) {
  const game = new Chess960();

  try {
    game.load(fen);
  } catch {
    return game;
  }

  if (!pv) return game;

  const moves = pv.trim().split(/\s+/);

  for (let i = 0; i < moves.length; i++) {
    if (pvMoveNumber !== -1 && i > pvMoveNumber) {
      break;
    }

    const uci = moves[i];
    if (!uci || uci.length < 4) {
      break;
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4];

    try {
      const result = game.move({ from, to, promotion: promotion as any });

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
): string {
  const turn = fen.split(" ")[1];
  const turnColor = turn === "w" ? "white" : "black";
  if (engineColor !== turnColor) {
    const moves = pv.trim().split(/\s+/);
    return moves.slice(1).join(" ");
  }
  return pv;
}

export function findPvDisagreementPoint(
  myInfo: CCCLiveInfo | undefined,
  opponentInfo: CCCLiveInfo | undefined,
  fen: string | undefined
): number {
  if (!myInfo?.info || !opponentInfo?.info || !fen) return -1;

  const myData = myInfo.info;
  const opponentData = opponentInfo.info;

  if (!myData.pv || !opponentData.pv || !myData.color || !opponentData.color)
    return -1;

  // Normalize both PVs to start from the current position, then compare directly
  const myMoves = normalizePv(myData.pv, myData.color, fen)
    .split(/\s+/)
    .filter(Boolean);
  const opponentMoves = normalizePv(opponentData.pv, opponentData.color, fen)
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < Math.min(myMoves.length, opponentMoves.length); i++) {
    if (myMoves[i] !== opponentMoves[i]) {
      return i;
    }
  }

  return -1;
}
