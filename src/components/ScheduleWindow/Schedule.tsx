import { memo, useCallback, useEffect, useRef } from "react";
import { EngineLogo } from "../EngineWindow/EngineLogo";
import "./Schedule.css";
import { MdOutlineClose } from "react-icons/md";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { getTimeControl } from "../../LiveInfo";

function formatDuration(value: number) {
  if (value === 1) return `ìn 1 minute`;
  if (value < 60) return `in ${value.toFixed(0)} minutes`;
  value = Math.round(value / 60);
  if (value === 1) return `in 1 hour`;
  return `in ${value.toFixed(0)} hours`;
}

function formatOutcome(outcome: string) {
  return outcome.replace(/-/, "\u2013"); // en dash
}

type ScheduleProps = { selectedEngineId: string };

const Schedule = memo(({ selectedEngineId }: ScheduleProps) => {
  const scheduleRef = useRef<HTMLDivElement>(null);
  const currentGameRef = useRef<HTMLDivElement>(null);

  const scrolledToCurrentGameRef = useRef(false);
  const userClickedRef = useRef(false);

  const selectedGame = useEventStore((state) => state.activeGame);
  const event = useEventStore((state) => state.activeEvent);
  const engines = useEventStore((state) => state.engines);
  const requestEvent = useEventStore((state) => state.requestEvent);

  const scrollToCurrentGame = useCallback(() => {
    if (
      !scheduleRef.current ||
      !currentGameRef.current ||
      scrolledToCurrentGameRef.current
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

    scrolledToCurrentGameRef.current = true;
  }, []);

  const currentGameCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      currentGameRef.current = node;
      if (node) {
        scrollToCurrentGame();
      }
    },
    [scrollToCurrentGame]
  );

  useEffect(() => {
    if (userClickedRef.current) {
      userClickedRef.current = false;
      return;
    }
    scrolledToCurrentGameRef.current = false;
    scrollToCurrentGame();
  }, [
    event?.tournamentDetails.tNr,
    event?.tournamentDetails.schedule.present?.gameNr,
    selectedGame?.gameDetails.gameNr,
    selectedEngineId,
    scrollToCurrentGame,
  ]);

  if (!event || !selectedGame || !engines) {
    return null;
  }

  const gamesList = [
    ...event.tournamentDetails.schedule.past,
    ...(event.tournamentDetails.schedule.present
      ? [event.tournamentDetails.schedule.present]
      : []),
    ...event.tournamentDetails.schedule.future,
  ];

  const { tcW, tcB } = getTimeControl(useLiveInfo.getState().game);

  const durationPerGame = event.tournamentDetails.schedule.past
    .map((game) => {
      if (!game.timeEnd || !game.timeStart) return null;
      return (
        new Date(game.timeEnd!).getTime() - new Date(game.timeStart!).getTime()
      );
    })
    .filter((duration) => !!duration) as number[];
  const averageDuration =
    durationPerGame.reduce(
      (prev, cur) => prev! + cur!,
      tcW.tcBase + tcB.tcBase + (100 * (tcW.tcIncrement + tcB.tcIncrement)) / 2
    ) /
    (durationPerGame.length + 1) /
    1000 /
    60;
  const currentGameIdx = event.tournamentDetails.schedule.past.length;

  const gamesPerRound = engines.length * (engines.length - 1);
  const scheduleClass = event.tournamentDetails.hasGamePairs
    ? " gamePairs"
    : "";

  return (
    <>
      <div className={"schedule" + scheduleClass} ref={scheduleRef}>
        {gamesList.map((game, i) => {
          const gameWhite = engines.find(
            (engine) => engine.id === game.whiteId
          );
          const gameBlack = engines.find(
            (engine) => engine.id === game.blackId
          );

          if (
            selectedEngineId &&
            ![gameWhite?.id, gameBlack?.id].includes(selectedEngineId)
          )
            return null;

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

          const isLiveGame =
            game.gameNr === event.tournamentDetails.schedule.present?.gameNr;
          const isSelectedGame =
            game.gameNr === String(selectedGame.gameDetails.gameNr);
          const ref = isSelectedGame ? currentGameCallbackRef : null;

          let gameClass = "";
          gameClass += !game.outcome && !isLiveGame ? " future" : "";
          gameClass += isSelectedGame ? " active" : "";
          gameClass += isLiveGame ? " live" : "";

          const isLastOfRound =
            event.tournamentDetails.isRoundRobin &&
            gamesPerRound > 2 &&
            (i + 1) % gamesPerRound === 0;
          gameClass += isLastOfRound ? " lastOfRound" : "";

          const vsText = isLiveGame
            ? "vs."
            : game.outcome
              ? formatOutcome(game.outcome)
              : formatDuration(averageDuration * (i - currentGameIdx));

          const ongoingAndNotSelectedGame = isLiveGame && !isSelectedGame;

          return (
            <div
              className={"game" + gameClass}
              ref={ref}
              key={game.gameNr}
              onClick={
                game.outcome || ongoingAndNotSelectedGame
                  ? () => {
                      userClickedRef.current = true;

                      if (ongoingAndNotSelectedGame) {
                        requestEvent();
                      } else {
                        requestEvent(game.gameNr);
                      }
                    }
                  : undefined
              }
            >
              <span className="round">#{i + 1}</span>
              <EngineLogo engine={gameWhite} size={28} />
              <span
                className={"engineName " + whiteClass}
                title={gameWhite?.name}
              >
                {gameWhite?.name}
              </span>
              <span className="vs">{vsText}</span>
              <span
                className={"engineName " + blackClass}
                title={gameBlack?.name}
              >
                {gameBlack?.name}
              </span>
              <EngineLogo engine={gameBlack} size={28} />
            </div>
          );
        })}
      </div>
      {String(selectedGame.gameDetails.gameNr) !==
        event.tournamentDetails.schedule.present?.gameNr && (
        <button
          className="closeButton"
          onClick={() => requestEvent()}
          title="Return to live game"
        >
          <MdOutlineClose />
        </button>
      )}
    </>
  );
});

export { Schedule };
