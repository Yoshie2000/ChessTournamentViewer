import { memo, useEffect, useRef, useState } from "react";
import type { CCCEngine, CCCEventUpdate, CCCGameUpdate } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./Schedule.css";
import { MdOutlineClose } from "react-icons/md";

type ScheduleProps = {
  engines: CCCEngine[];
  event: CCCEventUpdate;
  requestEvent: (gameNr?: string) => void;
  selectedGame: CCCGameUpdate;
};

function formatDuration(value: number) {
  if (value < 60) return `in ${value.toFixed(0)} minutes`;
  return `in ${(value / 60).toFixed(0)} hours`;
}

function formatOutcome(outcome: string) {
  return outcome.replace(/-/, "\u2013"); // en dash
}

const Schedule = memo(
  ({ engines, event, selectedGame, requestEvent }: ScheduleProps) => {
    const scheduleRef = useRef<HTMLDivElement>(null);
    const currentGameRef = useRef<HTMLDivElement>(null);

    const [scrolledToCurrentGame, setScrolledToCurrentGame] = useState(false);

    function scrollToCurrentGame() {
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
    }

    useEffect(() => {
      if (
        !scheduleRef.current ||
        !currentGameRef.current ||
        scrolledToCurrentGame
      )
        return;

      scrollToCurrentGame();

      setScrolledToCurrentGame(true);
    }, [scheduleRef.current, currentGameRef.current]);

    useEffect(() => {
      scrollToCurrentGame();
      setScrolledToCurrentGame(false);
    }, [
      event.tournamentDetails.tNr,
      event.tournamentDetails.schedule.present?.gameNr,
    ]);

    const gamesList = [
      ...event.tournamentDetails.schedule.past,
      ...(event.tournamentDetails.schedule.present
        ? [event.tournamentDetails.schedule.present]
        : []),
      ...event.tournamentDetails.schedule.future,
    ];

    const durationPerGame = event.tournamentDetails.schedule.past
      .map((game) => {
        if (!game.timeEnd || !game.timeStart) return null;
        return (
          new Date(game.timeEnd!).getTime() -
          new Date(game.timeStart!).getTime()
        );
      })
      .filter((duration) => !!duration) as number[];
    const averageDuration =
      durationPerGame.reduce((prev, cur) => prev! + cur!, 0) /
      durationPerGame.length /
      1000 /
      60;
    const currentGameIdx = event.tournamentDetails.schedule.past.length;

    const isTCEC = window.location.search.includes("tcec");
    const gamesPerRound = engines.length * (engines.length - 1);

    return (
      <>
        <div className="schedule" ref={scheduleRef}>
          {gamesList.map((game, i) => {
            const gameWhite = engines.find(
              (engine) => engine.id === game.whiteId
            );
            const gameBlack = engines.find(
              (engine) => engine.id === game.blackId
            );

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
            const ref =
              isCurrentGame || (isSelectedGame && tournamentOver)
                ? currentGameRef
                : null;

            let gameClass = isCurrentGame || isSelectedGame ? " active" : "";
            gameClass += !game.outcome && !isCurrentGame ? " future" : "";

            if (!isTCEC) {
              gameClass += (i + 1) % gamesPerRound === 0 ? " lastOfRound" : "";
            } else {
              gameClass +=
                game.roundNr !== gamesList.at(i + 1)?.roundNr
                  ? " lastOfRound"
                  : "";
            }

            const vsText = isCurrentGame
              ? "vs."
              : game.outcome
                ? formatOutcome(game.outcome)
                : formatDuration(averageDuration * (i - currentGameIdx));

            const ongoingAndNotSelectedGame = isCurrentGame && !isSelectedGame;

            return (
              <div
                className={"game" + gameClass}
                ref={ref}
                key={game.gameNr}
                onClick={
                  game.outcome || ongoingAndNotSelectedGame
                    ? () => requestEvent(game.gameNr)
                    : undefined
                }
              >
                <span className="round">#{i + 1}</span>
                <EngineLogo engine={gameWhite} size={28} />
                <span className={"engineName " + whiteClass}>
                  {gameWhite?.name}
                </span>
                <span className="vs">{vsText}</span>
                <span className={"engineName " + blackClass}>
                  {gameBlack?.name}
                </span>
                <EngineLogo engine={gameBlack} size={28} />
              </div>
            );
          })}
        </div>
        {String(selectedGame.gameDetails.gameNr) !==
          event.tournamentDetails.schedule.present?.gameNr && (
          <button className="closeButton" onClick={() => requestEvent()}>
            <MdOutlineClose />
          </button>
        )}
      </>
    );
  }
);

export { Schedule };
