import { MdOutlineClose } from "react-icons/md";
import type { CCCEngine, CCCEventUpdate, CCCGame } from "../types";
import "./Crosstable.css";

type CrosstableProps = {
  engines: CCCEngine[];
  cccEvent: CCCEventUpdate;
  onClose: () => void;
};

type GameResult = "win" | "loss" | "draw" | "tbd";
type GameScore = -1 | 0 | 1;
type Penta = [number, number, number, number, number];
type WDL = [number, number, number];
type EloClassName = "win" | "loss" | "draw" | "tbd";

const TWO_SIGMA_CONFIDENCE = 0.954499736103642;
const PROBABILITY_EPSILON = 1e-6;
const ELO_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function getResultForGame(game: CCCGame, engineId: string): GameResult {
  const whiteWin = game.whiteId === engineId ? "win" : "loss";
  const blackWin = game.blackId === engineId ? "win" : "loss";

  if (!game.outcome) {
    return "tbd";
  }

  if (game.outcome === "1-0") {
    return whiteWin;
  }

  if (game.outcome === "0-1") {
    return blackWin;
  }

  return "draw";
}

function scoreFromResult(result: Exclude<GameResult, "tbd">): GameScore {
  if (result === "win") {
    return 1;
  }

  if (result === "loss") {
    return -1;
  }

  return 0;
}

function pairClassFromResults(
  result1: GameResult,
  result2: GameResult
): "" | "win" | "loss" {
  if (result1 === "tbd" || result2 === "tbd") {
    return "";
  }

  const pairScore = scoreFromResult(result1) + scoreFromResult(result2);

  if (pairScore > 0) {
    return "win";
  }

  if (pairScore < 0) {
    return "loss";
  }

  return "";
}

function textFromResult(result: GameResult): string {
  if (result === "tbd") {
    return "-";
  }

  if (result === "win") {
    return "1";
  }

  if (result === "loss") {
    return "0";
  }

  return "½";
}

function clampProbability(probability: number): number {
  return Math.min(
    1 - PROBABILITY_EPSILON,
    Math.max(PROBABILITY_EPSILON, probability)
  );
}

function scoreToElo(score: number): number {
  return (-400 * Math.log(1 / score - 1)) / Math.LN10;
}

function inverseErrorFunction(value: number): number {
  const coefficient = (8 * (Math.PI - 3)) / (3 * Math.PI * (4 - Math.PI));
  const y = Math.log(1 - value * value);
  const z = 2 / (Math.PI * coefficient) + y / 2;
  const sign = value < 0 ? -1 : 1;

  return sign * Math.sqrt(Math.sqrt(z * z - y / coefficient) - z);
}

function phiInverse(probability: number): number {
  return Math.sqrt(2) * inverseErrorFunction(2 * probability - 1);
}

function calculateEloAndMargin(penta: Penta): {
  text: string;
  className: EloClassName;
} {
  const totalPairs = penta.reduce((sum, count) => sum + count, 0);

  if (totalPairs < 1) {
    return { text: "-", className: "tbd" };
  }

  const score =
    penta.reduce((sum, count, index) => sum + count * (index / 4), 0) /
    totalPairs;
  const elo = scoreToElo(clampProbability(score));

  const variance = penta.reduce((sum, count, index) => {
    const pairScore = index / 4;
    const probability = count / totalPairs;
    return sum + probability * (pairScore - score) ** 2;
  }, 0);

  const stdDeviation = Math.sqrt(variance / totalPairs);

  const minConfidenceProbability = (1 - TWO_SIGMA_CONFIDENCE) / 2;
  const maxConfidenceProbability = 1 - minConfidenceProbability;

  const minScore = clampProbability(
    score + phiInverse(minConfidenceProbability) * stdDeviation
  );
  const maxScore = clampProbability(
    score + phiInverse(maxConfidenceProbability) * stdDeviation
  );

  const errorMargin = (scoreToElo(maxScore) - scoreToElo(minScore)) / 2;

  const eloWithSign = `${elo >= 0 ? "+" : ""}${ELO_FORMATTER.format(elo)}`;

  return {
    text: `${eloWithSign} +/- ${ELO_FORMATTER.format(errorMargin)}`,
    className: elo > 0 ? "win" : elo < 0 ? "loss" : "draw",
  };
}

function calculatePentaAndWDL(
  gamePairs: [CCCGame, CCCGame][],
  engineId: string
): { penta: Penta; wdl: WDL } {
  const penta: Penta = [0, 0, 0, 0, 0];
  const wdl: WDL = [0, 0, 0];
  for (const gamePair of gamePairs) {
    const result1 = getResultForGame(gamePair[0], engineId);
    const result2 = getResultForGame(gamePair[1], engineId);

    if (result1 !== "tbd") {
      const score1 = scoreFromResult(result1);
      if (score1 === 1) {
        wdl[0] += 1;
      } else if (score1 === 0) {
        wdl[1] += 1;
      } else {
        wdl[2] += 1;
      }
    }

    if (result2 !== "tbd") {
      const score2 = scoreFromResult(result2);
      if (score2 === 1) {
        wdl[0] += 1;
      } else if (score2 === 0) {
        wdl[1] += 1;
      } else {
        wdl[2] += 1;
      }
    }

    if (result1 === "tbd" || result2 === "tbd") {
      continue;
    }

    const pairScore = scoreFromResult(result1) + scoreFromResult(result2);

    if (pairScore === -2) {
      penta[0] += 1;
    } else if (pairScore === -1) {
      penta[1] += 1;
    } else if (pairScore === 0) {
      penta[2] += 1;
    } else if (pairScore === 1) {
      penta[3] += 1;
    } else {
      penta[4] += 1;
    }
  }

  return { penta, wdl };
}

function formatPenta(penta: Penta): string {
  return "[" + penta.join(", ") + "]";
}

export function Crosstable({ engines, cccEvent, onClose }: CrosstableProps) {
  const allGames = [
    ...cccEvent.tournamentDetails.schedule.past,
    ...(cccEvent.tournamentDetails.schedule.present
      ? [cccEvent.tournamentDetails.schedule.present]
      : []),
    ...cccEvent.tournamentDetails.schedule.future,
  ];

  return (
    <table className="crosstable">
      <tbody>
        <tr>
          <td>
            <button className="closeButton" onClick={onClose}>
              <MdOutlineClose />
            </button>
          </td>
          {engines.map((engine, i) => (
            <td key={engine.id}>
              #{i + 1}. {engine.name}
            </td>
          ))}
        </tr>
        {engines.map((engine, i) => (
          <tr key={engine.id}>
            <td>
              #{i + 1}. {engine.name}
            </td>
            {engines.map((engine2) => {
              if (engine.id === engine2.id) {
                return <td key={engine2.id}>-</td>;
              }

              const games = allGames.filter(
                (game) =>
                  (game.blackId === engine.id && game.whiteId === engine2.id) ||
                  (game.whiteId === engine.id && game.blackId === engine2.id)
              );

              const gamePairs: CCCGame[][] = [];
              for (
                let gameIndex = 0;
                gameIndex < games.length;
                gameIndex += 2
              ) {
                gamePairs.push(games.slice(gameIndex, gameIndex + 2));
              }

              const completeGamePairs = gamePairs.filter(
                (gamePair): gamePair is [CCCGame, CCCGame] =>
                  gamePair.length > 1
              );

              const { penta } = calculatePentaAndWDL(
                completeGamePairs,
                engine.id
              );
              const elo = calculateEloAndMargin(penta);

              return (
                <td key={engine2.id} className="h2hCell">
                  <div className="h2hStats">
                    <span
                      className="pentaStat"
                      title="Penta (0-2): LL, LD, WL/DD, WD, WW"
                    >
                      P: {formatPenta(penta)}
                    </span>
                    <span className={`eloStat elo ${elo.className}`}>
                      Elo: {elo.text}
                    </span>
                  </div>

                  <div className="h2h">
                    {completeGamePairs.map((gamePair) => {
                      const result1 = getResultForGame(gamePair[0], engine.id);
                      const result2 = getResultForGame(gamePair[1], engine.id);

                      const pairResult = pairClassFromResults(result1, result2);

                      return (
                        <span
                          key={gamePair[0].gameNr}
                          className={["gamePair", pairResult]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className={result1}>
                            {textFromResult(result1)}
                          </span>
                          <span className={result2}>
                            {textFromResult(result2)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
