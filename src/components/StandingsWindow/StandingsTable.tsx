import { memo } from "react";
import { EngineLogo } from "../EngineWindow/EngineLogo";
import { useEventStore } from "../../context/EventContext";

import "./StandingsTable.css";

export const StandingsTable = memo(function () {
  const engines = useEventStore((state) => state.engines) ?? [];

  return (
    <div className="standings">
      {engines.map((engine, index) => (
        <div key={engine.id} className="standingsEntry">
          <div className="placement">#{index + 1}</div>
          <EngineLogo engine={engine} size={28} />
          <div className="name">{engine.name}</div>
          <div className="score">
            {engine.points} / {engine.playedGames}
          </div>
          <div className="perf">{engine.perf}%</div>
          <div className="rating">{engine.rating}</div>
        </div>
      ))}
    </div>
  );
});
