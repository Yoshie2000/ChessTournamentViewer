import type { DrawShape } from "@lichess-org/chessground/draw";
import { Chess960, type Color, type Square } from "./chess.js/chess";
import type { CCCEngine, CCCLiveInfo } from "./types";
import { sanToUci, uciToSan } from "./utils";

export type EngineColor = "white" | "black" | "red" | "blue" | "green";
export type LiveInfoEntry = CCCLiveInfo | undefined;
export type LiveEngineDataObject = {
  engineInfo: CCCEngine;
  liveInfo: LiveInfoEntry[];
};
export type LiveEngineData = Record<EngineColor, LiveEngineDataObject>;

export type LiveEngineDataEntryObject = {
  engineInfo: CCCEngine;
  liveInfo: LiveInfoEntry;
};
export type LiveEngineDataEntry = Record<
  EngineColor,
  LiveEngineDataEntryObject
>;

export const EmptyEngineDefinition: CCCEngine = {
  authors: "",
  config: { command: "", options: {}, timemargin: 0 },
  country: "",
  elo: "",
  facts: "",
  flag: "",
  id: "",
  imageUrl: "",
  name: "",
  perf: "",
  playedGames: "",
  points: "",
  rating: "",
  updatedAt: "",
  version: "",
  website: "",
  year: "",
};

export function parseTCECLiveInfo(
  json: any,
  fen: string,
  color: "blue" | "red"
): CCCLiveInfo {
  const blackToMove = json.pv.includes("...");
  const fullmove = blackToMove
    ? Number(json.pv.split("...")[0])
    : Number(json.pv.split(".")[0]);
  const ply = 2 * (fullmove - 1) + (blackToMove ? 1 : 0);

  const tmpGame = new Chess960(fen);
  const pvMoves = json.pv
    .split(/ |\.\.\./)
    .filter((str: string) => !str.match(/^\d+\.?$/));

  const lanMoves: string[] = [];
  for (let pvMove of pvMoves) {
    try {
      const move = tmpGame.move(pvMove, { strict: false });
      if (move) {
        lanMoves.push(move.lan);
      } else {
        break;
      }
    } catch (_) {
      break;
    }
  }

  let score = String(json.eval);
  const scoreNumber = Number(score);
  if (!isNaN(scoreNumber)) {
    score = scoreNumber.toFixed(2);
    if (!score.startsWith("+") && !score.startsWith("-")) score = "+" + score;
  } else {
    score = score.replaceAll("#", "");
  }

  return {
    type: "liveInfo",
    info: {
      color: color,
      depth: json.depth.split("/")[0],
      hashfull: "-",
      multipv: "1",
      name: "",
      nodes: String(json.nodes),
      pv: lanMoves.join(" "),
      pvSan: pvMoves.join(" "),
      score,
      seldepth: json.depth.split("/")[1],
      speed: String(
        Number(json.speed.split(" ")[0]) * (color === "blue" ? 1000 : 1000000)
      ),
      tbhits: String(json.tbhits),
      time: "-",
      timeLeft: 0,
      ply,
    },
  };
}

export function getLiveInfosForMove(
  liveEngineData: LiveEngineData,
  moveNumber: number,
  turn: Color
) {
  function kibitzer(base: LiveInfoEntry, color: "red" | "green" | "blue") {
    const array = liveEngineData[color].liveInfo;
    return {
      engineInfo: liveEngineData[color].engineInfo,
      liveInfo:
        array.at(base?.info.ply ?? moveNumber) ??
        array.at(base?.info.ply ? base?.info.ply - 1 : moveNumber),
    };
  }

  if (turn === "w") {
    const white = liveEngineData.white.liveInfo.at(moveNumber);
    const black = liveEngineData.black.liveInfo.at(
      moveNumber === -1 ? -1 : Math.max(0, moveNumber - 1)
    );

    return {
      black: { liveInfo: black, engineInfo: liveEngineData.black.engineInfo },
      white: { liveInfo: white, engineInfo: liveEngineData.white.engineInfo },
      green: kibitzer(white, "green"),
      red: kibitzer(white, "red"),
      blue: kibitzer(white, "blue"),
    };
  } else {
    const white = liveEngineData.white.liveInfo.at(
      moveNumber === -1 ? -1 : Math.max(0, moveNumber - 1)
    );
    const black = liveEngineData.black.liveInfo.at(moveNumber);

    return {
      black: { liveInfo: black, engineInfo: liveEngineData.black.engineInfo },
      white: { liveInfo: white, engineInfo: liveEngineData.white.engineInfo },
      green: kibitzer(black, "green"),
      red: kibitzer(black, "red"),
      blue: kibitzer(black, "blue"),
    };
  }
}

export function extractLiveInfoFromTCECComment(
  comment: string,
  fenBeforeMove: string,
  array?: LiveInfoEntry[],
  tcBase?: number,
  tcIncrement?: number
): LiveInfoEntry {
  const ply = plyFromFen(fenBeforeMove);
  const data = comment.split(", ") ?? [];

  if (data[0] === "book") return;

  let score = data[data.findIndex((s) => s.includes("wv="))].split("=")[1];
  if (
    score.startsWith("M") ||
    (!score.startsWith("+") && !score.startsWith("-"))
  ) {
    score = "+" + score;
  }

  const tmpGame = new Chess960(fenBeforeMove);
  const isWhite = tmpGame.turn() === "w";
  const sanMoves = data[data.findIndex((s) => s.includes("pv="))]
    .replace("pv=", "")
    .replaceAll('"', "");
  const uciMoves = sanToUci(fenBeforeMove, sanMoves.split(" "));

  const time = data[data.findIndex((s) => s.includes("mt="))].split("=")[1];
  let timeLeft: number = 0;
  if (array && tcBase && tcIncrement) {
    const previousTimeLeft = array.at(-1)?.info.timeLeft ?? tcBase;
    timeLeft = previousTimeLeft + tcIncrement - Number(time);
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
      pv: uciMoves.join(" "),
      pvSan: sanMoves,
      score,
      seldepth: data[data.findIndex((s) => s.includes("sd="))].split("=")[1],
      speed: data[data.findIndex((s) => s.includes("s="))].split("=")[1],
      tbhits: data[data.findIndex((s) => s.includes("tb="))]
        .split("=")[1]
        .replace("null", "-"),
      time,
      timeLeft,
    },
  };
  return liveInfo;
}

function extractLiveInfoFromTCECGame(game: Chess960) {
  const liveInfosWhite: LiveInfoEntry[] = [];
  const liveInfosBlack: LiveInfoEntry[] = [];

  const { tcBase, tcIncrement } = getTimeControl(game);

  game
    .getComments()
    .slice(1)
    .forEach((value) => {
      const ply = plyFromFen(value.fen);
      const fenBeforeMove = game.fenAt(ply - 1);
      const array = fenBeforeMove.includes(" w ")
        ? liveInfosWhite
        : liveInfosBlack;
      const liveInfo = extractLiveInfoFromTCECComment(
        value.comment ?? "",
        fenBeforeMove,
        array,
        tcBase,
        tcIncrement
      );
      if (!liveInfo) return;

      array[liveInfo.info.ply] = liveInfo;
    });

  return { liveInfosWhite, liveInfosBlack };
}

export function getTimeControl(game: Chess960) {
  const timeControl = game.getHeaders()["TimeControl"];
  if (!timeControl) return { tcBase: 0, tcIncrement: 0 };
  const tcBase = 1000 * Number(timeControl.split("+")[0]);
  const tcIncrement = 1000 * Number(timeControl.split("+")[1]);
  return { tcBase, tcIncrement };
}

export function extractLiveInfoFromGame(game: Chess960) {
  if (game.getHeaders()["Site"]?.includes("tcec"))
    return extractLiveInfoFromTCECGame(game);

  const { tcBase, tcIncrement } = getTimeControl(game);

  const startingFen = game.getHeaders()["FEN"] ?? "";

  const liveInfosWhite: LiveInfoEntry[] = [];
  const liveInfosBlack: LiveInfoEntry[] = [];
  game.getComments().forEach((value, i, allValues) => {
    const data = value.comment?.split(", ") ?? [];

    if (data[0] === "book") return;

    const fenBeforeMove = allValues[i - 1]?.fen ?? startingFen;
    const color = fenBeforeMove.includes(" w ") ? "white" : "black";

    let score = data[0].split("/")[0];
    if (color === "black") {
      if (score.includes("+")) score = score.replace("+", "-");
      else score = score.replace("-", "+");
    }

    const pvString = data[8].replace("pv=", "").replaceAll('"', "");
    const sanPv = uciToSan(fenBeforeMove, pvString.split(" ")).join(" ");

    const array = color === "white" ? liveInfosWhite : liveInfosBlack;
    const time = data[0].split(" ")[1].split("s")[0].replace(".", "");
    const previousTimeLeft = array.at(-1)?.info.timeLeft ?? tcBase;
    const timeLeft = previousTimeLeft + tcIncrement - Number(time);

    const liveInfo: CCCLiveInfo = {
      type: "liveInfo",
      info: {
        color,
        depth: data[0].split("/")[1].split(" ")[0],
        multipv: "1",
        hashfull: data[6].split("=")[1],
        name: "",
        nodes: data[3].split("=")[1],
        ply: i,
        pv: pvString,
        pvSan: sanPv,
        score,
        seldepth: data[4].split("=")[1],
        speed: data[5].split("=")[1],
        tbhits: data[7].split("=")[1],
        time,
        timeLeft,
      },
    };

    array[liveInfo.info.ply] = liveInfo;
  });

  return { liveInfosWhite, liveInfosBlack };
}

export function plyFromFen(fen: string): number {
  const color = fen.includes(" w ") ? "white" : "black";
  const fenParts = fen.split(" ");
  const fullmoves = Number(fenParts[fenParts.length - 1]) || 1;
  const ply = 2 * fullmoves - (color === "white" ? 1 : 0) - 1;
  return ply;
}

export function extractLiveInfoFromInfoString(
  raw: string,
  fen: string,
  brush: string = ""
) {
  let data = raw.split(" ");
  if (data.includes("string")) data = data.slice(0, data.indexOf("string") - 1);

  const color = fen.includes(" w ") ? "white" : "black";
  const ply = plyFromFen(fen);

  const time = Number(data[data.indexOf("time") + 1]);
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

  const bestmove = data[data.indexOf("pv") + 1];
  const arrow: DrawShape | null =
    bestmove && bestmove.length >= 4
      ? {
          orig: bestmove.slice(0, 2) as Square,
          dest: bestmove.slice(2, 4) as Square,
          brush,
        }
      : null;

  const pvMoves = data.slice(data.indexOf("pv") + 1);
  const sanMoves = uciToSan(fen, pvMoves);

  const liveInfo: CCCLiveInfo = {
    type: "liveInfo",
    info: {
      ply,
      color,
      score,
      depth: data[data.indexOf("depth") + 1],
      name: "",
      hashfull: data.includes("hashfull")
        ? data[data.indexOf("hashfull") + 1]
        : "-",
      multipv: data[data.indexOf("multipv") + 1],
      nodes: data[data.indexOf("nodes") + 1],
      pv: pvMoves.join(" "),
      pvSan: sanMoves.join(" "),
      seldepth: data.includes("seldepth")
        ? data[data.indexOf("seldepth") + 1]
        : "-",
      speed: data[data.indexOf("nps") + 1],
      tbhits: data[data.indexOf("tbhits") + 1] ?? "-",
      time: String(time),
      timeLeft: 0,
    },
  };

  return { liveInfo, arrow };
}
