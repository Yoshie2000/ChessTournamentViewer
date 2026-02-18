import type { DrawShape } from "@lichess-org/chessground/draw";
import { Chess960, type Square } from "../chess.js/chess";
import type { CCCLiveInfo } from "../types";

export type LiveInfoEntry = CCCLiveInfo | undefined;

export function extractLiveInfoFromTCECComment(
  comment: string,
  fenBeforeMove: string,
  ply: number
): LiveInfoEntry {
  const data = comment.split(", ") ?? [];

  if (data[0] === "book") return;

  let score = data[data.findIndex((s) => s.includes("wv="))].split("=")[1];
  if (score.startsWith("M")) {
    score = "+" + score;
  }

  const tmpGame = new Chess960(fenBeforeMove);
  const isWhite = tmpGame.turn() === "w";
  const pvMoves = data[data.findIndex((s) => s.includes("pv="))]
    .replace("pv=", "")
    .replaceAll('"', "")
    .split(" ");

  const lanMoves: string[] = [];
  for (let pvMove of pvMoves) {
    const move = tmpGame.move(pvMove, { strict: false });
    if (move) {
      lanMoves.push(move.lan);
    } else {
      break;
    }
  }

  const liveInfo: CCCLiveInfo = {
    type: "liveInfo",
    info: {
      color: isWhite ? "white" : "black",
      depth: data[data.findIndex((s) => s.includes("d="))].split("=")[1],
      multipv: "1",
      hashfull: String(
        Number(data[data.findIndex((s) => s.includes("h="))].split("=")[1]) * 10
      ),
      name: "",
      nodes: data[data.findIndex((s) => s.includes("n="))].split("=")[1],
      ply: ply,
      pv: lanMoves.join(" "),
      score,
      seldepth: data[data.findIndex((s) => s.includes("sd="))].split("=")[1],
      speed: data[data.findIndex((s) => s.includes("s="))].split("=")[1],
      tbhits: data[data.findIndex((s) => s.includes("tb="))]
        .split("=")[1]
        .replace("null", "-"),
      time: data[data.findIndex((s) => s.includes("mt="))].split("=")[1],
    },
  };
  return liveInfo;
}

function extractLiveInfoFromTCECGame(game: Chess960) {
  const liveInfosWhite: LiveInfoEntry[] = [];
  const liveInfosBlack: LiveInfoEntry[] = [];

  game
    .getComments()
    .slice(1)
    .forEach((value, i, allValues) => {
      const fenBeforeMove = allValues[i - 1]?.fen;
      const liveInfo = extractLiveInfoFromTCECComment(
        value.comment ?? "",
        fenBeforeMove,
        i + 1
      );
      if (!liveInfo) return;

      if (fenBeforeMove.includes(" w "))
        liveInfosWhite[liveInfo.info.ply] = liveInfo;
      else liveInfosBlack[liveInfo.info.ply] = liveInfo;
    });

  return { liveInfosWhite, liveInfosBlack };
}

export function extractLiveInfoFromGame(game: Chess960) {
  if (game.getHeaders()["Site"]?.includes("tcec"))
    return extractLiveInfoFromTCECGame(game);

  const liveInfosWhite: LiveInfoEntry[] = [];
  const liveInfosBlack: LiveInfoEntry[] = [];
  game.getComments().forEach((value, i) => {
    const data = value.comment?.split(", ") ?? [];

    if (data[0] === "book") return;

    let score = data[0].split("/")[0];
    if (i % 2 === 1) {
      if (score.includes("+")) score = score.replace("+", "-");
      else score = score.replace("-", "+");
    }

    const liveInfo: CCCLiveInfo = {
      type: "liveInfo",
      info: {
        color: i % 2 === 0 ? "white" : "black",
        depth: data[0].split("/")[1].split(" ")[0],
        multipv: "1",
        hashfull: data[6].split("=")[1],
        name: "",
        nodes: data[3].split("=")[1],
        ply: i + 1,
        pv: data[8].replace("pv=", "").replaceAll('"', ""),
        score,
        seldepth: data[4].split("=")[1],
        speed: data[5].split("=")[1],
        tbhits: data[7].split("=")[1],
        time: data[0].split(" ")[1].split("s")[0].replace(".", ""),
      },
    };
    if (i % 2 === 0) liveInfosWhite[liveInfo.info.ply] = liveInfo;
    else liveInfosBlack[liveInfo.info.ply] = liveInfo;
  });

  return { liveInfosWhite, liveInfosBlack };
}

export function emptyLiveInfo(): CCCLiveInfo {
  return {
    type: "liveInfo",
    info: {
      color: "b",
      depth: "0",
      hashfull: "0",
      multipv: "1",
      name: "",
      nodes: "0",
      ply: 0,
      pv: "",
      score: "+0.00",
      seldepth: "0",
      speed: "0",
      tbhits: "0",
      time: "0",
    },
  };
}

export function plyFromFen(fen: string): number {
  const color = fen.includes(" w ") ? "white" : "black";
  const fenParts = fen.split(" ");
  const fullmoves = Number(fenParts[fenParts.length - 1]) || 1;
  const ply = 2 * fullmoves - (color === "white" ? 1 : 0) - 1;
  return ply;
}

export function extractLiveInfoFromInfoString(raw: string, fen: string) {
  const data = raw.split(" ");
  const color = fen.includes(" w ") ? "white" : "black";
  const ply = plyFromFen(fen);

  const time = Number(data[17]);
  if (isNaN(time)) return null;

  let score = "+0.00";
  const scoreIdx = data.indexOf("score");
  if (scoreIdx !== -1) {
    if (data[scoreIdx + 1] === "cp") {
      const scoreNumber =
        (Number(data[scoreIdx + 2]) / 100) * (color === "black" ? -1 : 1);
      score = (scoreNumber >= 0 ? "+" : "") + scoreNumber;
      if (!score.includes(".")) score += ".";
      while (score.split(".")[1].length < 2) score += "0";
    } else {
      const scoreNumber =
        Number(data[scoreIdx + 2]) * (color === "black" ? -1 : 1);
      score = (scoreNumber >= 0 ? "+" : "-") + "M" + Math.abs(scoreNumber);
    }
  }

  const bestmove = data[19];
  const arrow: DrawShape | null =
    bestmove && bestmove.length >= 4
      ? {
          orig: bestmove.slice(0, 2) as Square,
          dest: bestmove.slice(2, 4) as Square,
          brush: "kibitzer",
        }
      : null;

  const liveInfo: CCCLiveInfo = {
    type: "liveInfo",
    info: {
      ply,
      color,
      score,
      depth: data[data.indexOf("depth") + 1],
      name: "",
      hashfull: data[data.indexOf("hashfull") + 1],
      multipv: data[data.indexOf("multipv") + 1],
      nodes: data[data.indexOf("nodes") + 1],
      pv: data.slice(data.indexOf("pv") + 1).join(" "),
      seldepth: data[data.indexOf("seldepth") + 1],
      speed: data[data.indexOf("nps") + 1],
      tbhits: data[data.indexOf("tbhits") + 1] ?? "-",
      time: data[data.indexOf("time") + 1],
    },
  };

  return { liveInfo, arrow };
}
