import { memo } from "react";
import type { CCCEngine, CCCEventUpdate } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./StandingsTable.css";

type StandingsTableProps = { engines: CCCEngine[]; cccEvent: CCCEventUpdate };

export const StandingsTable = memo(function ({
  engines,
  cccEvent,
}: StandingsTableProps) {
  function findEveryParticipation(engine: CCCEngine) {
    let count = 0;

    cccEvent?.tournamentDetails?.schedule.past.forEach((el) => {
      if (el.blackId === engine.id || el.whiteId === engine.id) {
        count++;
      }
    });

    return count;
  }

  return (
    <div className="standingsWrapper">
      <table className="standings">
        <tbody>
          {engines.map((engine, index) => {
            const playedGames = findEveryParticipation(engine);

            return (
              <tr key={engine.id} className="standingsEntry">
                <td className="placement">#{index + 1}</td>
                <td className="logo">
                  <EngineLogo engine={engine} />
                </td>
                <td className="name">{engine.name}</td>
                <td className="score">
                  {engine.points} / {playedGames}
                </td>
                <td className="perf">{engine.perf}%</td>
                <td className="rating">{engine.rating}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
