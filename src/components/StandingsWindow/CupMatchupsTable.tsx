import { useEventStore } from "@/context/EventContext";
import H2hStats from "../Popup/H2hStats";
import { EngineLogo } from "../EngineWindow/EngineLogo";
import "./CupMatchupsTable.css";

export default function CupMatchupsTable() {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const engines = useEventStore((state) => state.engines);
  const cupMatches = activeEvent?.tournamentDetails.cupMatches;

  if (!activeEvent || !engines || !cupMatches) return null;

  const allGames = [
    ...activeEvent.tournamentDetails.schedule.past,
    ...(activeEvent.tournamentDetails.schedule.present
      ? [activeEvent.tournamentDetails.schedule.present]
      : []),
    ...activeEvent.tournamentDetails.schedule.future,
  ];

  const cupMatchups = allGames.reduce((prev, cur) => {
    const matchup = new Set([cur.blackId, cur.whiteId]);
    return prev.some(
      (otherMatchup) => otherMatchup.intersection(matchup).size === 2
    )
      ? prev
      : [...prev, matchup];
  }, [] as Set<string>[]);

  return (
    <div className="cupMatchups">
      {cupMatchups.map((matchup, matchIdx) => {
        const [engine0Id, engine1Id] = matchup;
        const engine0 = engines.find((engine) => engine.id === engine0Id)!;
        const engine1 = engines.find((engine) => engine.id === engine1Id)!;

        const cupMatch = cupMatches
          .flat()
          .find(
            (match) =>
              (match.engine0?.id === engine0Id &&
                match.engine1?.id === engine1Id) ||
              (match.engine1?.id === engine0Id &&
                match.engine0?.id === engine1Id)
          )!;
        const points0 =
          cupMatch.engine0?.id === engine0Id
            ? cupMatch.points0
            : cupMatch.points1;
        const points1 =
          cupMatch.engine1?.id === engine1Id
            ? cupMatch.points1
            : cupMatch.points0;

        const engine0Class =
          !cupMatch.live &&
          cupMatch.points0 !== undefined &&
          cupMatch.points1 !== undefined
            ? cupMatch.points0 > cupMatch.points1
              ? "winner"
              : cupMatch.points1 > cupMatch.points0
                ? "loser"
                : ""
            : "";
        const engine1Class =
          engine0Class === "winner"
            ? "loser"
            : engine0Class === "loser"
              ? "winner"
              : "";

        return (
          <div
            className={`matchup ${cupMatch.live ? "live" : ""}`}
            key={engine0Id + engine1Id}
          >
            <div className="scoreLine">
              <div className="matchNr">#{matchIdx + 1}</div>
              <EngineLogo engine={engine0} size={28} />
              <div className={`engineName ${engine0Class}`}>{engine0.name}</div>
              <div className="score">
                {points0}–{points1}
              </div>
              <div className={`engineName ${engine1Class}`}>{engine1.name}</div>
              <EngineLogo engine={engine1} size={28} />
            </div>
            <H2hStats engine={engine0} engine2={engine1} allGames={allGames} />
          </div>
        );
      })}
    </div>
  );
}
