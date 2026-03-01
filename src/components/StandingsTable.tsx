import { memo } from "react";
import type { CCCEngine } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./StandingsTable.css";

type StandingsTableProps = { engines: CCCEngine[] };

export const StandingsTable = memo(function ({ engines }: StandingsTableProps) {
  return (
    <div className="standingsWrapper">
      <table className="standings">
        <tbody>
          {engines.map((engine, index) => (
            <tr key={engine.id} className="standingsEntry">
              <td className="placement">#{index + 1}</td>
              <td className="logo">
                <EngineLogo engine={engine} />
              </td>
              <td className="name">{engine.name}</td>
              <td className="score">
                {engine.points} / {engine.playedGames}
              </td>
              <td className="perf">{engine.perf}%</td>
              <td className="rating">{engine.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
