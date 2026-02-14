import { memo, useEffect, useRef, useState } from "react";
import type { CCCEngine, CCCEventUpdate, CCCGameUpdate } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./Schedule.css";

type ScheduleProps = {
  engines: CCCEngine[];
  event: CCCEventUpdate;
  requestEvent: (gameNr: string) => void;
  selectedGame: CCCGameUpdate;
};

const Schedule = memo(
  ({ engines, event, selectedGame, requestEvent }: ScheduleProps) => {
    const scheduleRef = useRef<HTMLDivElement>(null);
    const currentGameRef = useRef<HTMLDivElement>(null);

    const [scrolledToCurrentGame, setScrolledToCurrentGame] = useState(false);

    useEffect(() => {
      if (
        !scheduleRef.current ||
        !currentGameRef.current ||
        scrolledToCurrentGame
      )
        return;

      const parentRect = scheduleRef.current.getBoundingClientRect();
      const childRect = currentGameRef.current.getBoundingClientRect();
      const relativeChildTop = childRect.top - parentRect.top;

      scheduleRef.current.scrollTo({
        top:
          scheduleRef.current.scrollTop +
          relativeChildTop -
          scheduleRef.current.clientHeight / 2 +
          currentGameRef.current.clientHeight / 2,
        behavior: "instant",
      });
      setScrolledToCurrentGame(true);
    }, [scheduleRef.current, currentGameRef.current]);

    useEffect(() => {
      setScrolledToCurrentGame(false);
    }, [event.tournamentDetails.tNr]);

    const gamesList = [
      ...event.tournamentDetails.schedule.past,
      ...(event.tournamentDetails.schedule.present
        ? [event.tournamentDetails.schedule.present]
        : []),
      ...event.tournamentDetails.schedule.future,
    ];

    return (
      <div className="schedule" ref={scheduleRef}>
        {gamesList.map((game, i) => {
          const gameWhite = engines.find(
            (engine) => engine.id === game.whiteId
          )!!;
          const gameBlack = engines.find(
            (engine) => engine.id === game.blackId
          )!!;

          const whiteClass =
            game.outcome === "1-0"
              ? "winner"
              : game.outcome === "0-1"
                ? "loser"
                : game.timeEnd
                  ? "draw"
                  : "tbd";
          const blackClass =
            game.outcome === "1-0"
              ? "loser"
              : game.outcome === "0-1"
                ? "winner"
                : game.timeEnd
                  ? "draw"
                  : "tbd";

          const isCurrentGame =
            game.gameNr === event.tournamentDetails.schedule.present?.gameNr;
          const isSelectedGame =
            game.gameNr === String(selectedGame.gameDetails.gameNr);
          const tournamentOver =
            !event.tournamentDetails.schedule.present &&
            event.tournamentDetails.schedule.future.length === 0;
          const gameClass = isCurrentGame || isSelectedGame ? " active" : "";
          const ref =
            isCurrentGame || (isSelectedGame && tournamentOver)
              ? currentGameRef
              : null;

          return (
            <div
              className={"game" + gameClass}
              ref={ref}
              key={game.gameNr}
              onClick={() => requestEvent(game.gameNr)}
            >
              <span className="round">#{i + 1}</span>
              <EngineLogo engine={gameWhite} size={28}/>
              <span className={"engineName " + whiteClass}>
                {gameWhite.name}
              </span>
              <span className="vs">vs.</span>
              <span className={"engineName " + blackClass}>
                {gameBlack.name}
              </span>
              <EngineLogo engine={gameBlack} size={28} />
            </div>
          );
        })}
      </div>
    );
  }
);

export { Schedule };