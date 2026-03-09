import { useCallback, useEffect, useRef, useState } from "react";
import { CCCWebSocket, type TournamentWebSocket } from "./CCCWebsocket";
import type { CCCMessage, CCCLiveInfo } from "./types";
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Schedule } from "./components/Schedule";
import "./App.css";
import "./components/Popup.css";
import {
  extractLiveInfoFromGame,
  type LiveEngineData,
  EmptyEngineDefinition,
  type EngineColor,
} from "./LiveInfo";
import { Crosstable } from "./components/Crosstable";
import { Spinner } from "./components/Loading";
import { NativeWorker } from "./engine/NativeWorker";
import { type EngineSettings, EngineWorker } from "./engine/EngineWorker";
import { StockfishWorker } from "./engine/StockfishWorker";
import { EngineWindow } from "./components/EngineWindow";
import { EngineMinimal } from "./components/EngineMinimal";
import { Chess, type Square } from "./chess.js/chess";
import { GameResultOverlay } from "./components/GameResultOverlay";
import { getDefaultKibitzerSettings, Settings } from "./components/Settings";
import { TCECWebSocket } from "./TCECWebsocket";
import { MoveList } from "./components/MoveList";
import { loadLiveInfos } from "./LocalStorage";
import { uciToSan } from "./utils";
import { useLiveInfo } from "./context/LiveInfoContext";
import { useEventStore } from "./context/EventContext";
import { EventListWindow } from "./components/EventList/EventList";
import { GraphWindow } from "./components/GraphWindow/GraphWindow";
import { StandingsWindow } from "./components/StandingsWindow/StandingsWindow";
import { usePopup } from "./context/PopupContext";
import { useLiveBoard } from "./hooks/BoardHook";

const CLOCK_UPDATE_MS = 100;

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const isTCEC = window.location.search.includes("tcec");

const _initialWS = isTCEC ? new TCECWebSocket() : new CCCWebSocket();

function App() {
  const ws = useRef<TournamentWebSocket>(_initialWS);

  const kibitzer = useRef<EngineWorker[]>(null);
  const [moves, setMoves] = useState<string[]>([]);

  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  const setEvent = useEventStore((state) => state.setEvent);
  const setGame = useEventStore((state) => state.setGame);
  const setEventList = useEventStore((state) => state.setEventList);

  const currentMoveNumber = useLiveInfo((state) => state.currentMoveNumber);
  const setCurrentMoveNumber = useLiveInfo(
    (state) => state.setCurrentMoveNumber
  );

  const setClocks = useLiveInfo((state) => state.setClocks);
  const setLiveEngineData = useLiveInfo((state) => state.setLiveEngineData);
  const updateLiveEngineData = useLiveInfo(
    (state) => state.updateLiveEngineData
  );

  const popupState = usePopup((state) => state.popupState);

  const [kibitzerSettings, setKibitzerSettings] = useState<EngineSettings>(
    getDefaultKibitzerSettings()
  );

  const currentFen = useLiveInfo((state) => state.currentFen);
  const setCurrentFen = useLiveInfo((state) => state.setCurrentFen);
  const { Board, game, updateBoard } = useLiveBoard({
    animated: true,
    id: "main-board",
  });

  function updateClocks() {
    setClocks((currentClock) => {
      if (!currentClock) return currentClock;
      const result = game.getHeaders()["Result"];
      if (result && result !== "*") return { ...currentClock };

      let wtime = Number(currentClock.wtime);
      let btime = Number(currentClock.btime);

      if (game.turn() == "w") wtime -= CLOCK_UPDATE_MS;
      else btime -= CLOCK_UPDATE_MS;

      return { ...currentClock, wtime: String(wtime), btime: String(btime) };
    });
  }

  useEffect(() => {
    if (!cccEvent) return;

    const wEngine =
      cccEvent.tournamentDetails.engines.find(
        (engine) => engine.name === game.getHeaders()["White"]
      ) || EmptyEngineDefinition;

    const bEngine =
      cccEvent.tournamentDetails.engines.find(
        (engine) => engine.name === game.getHeaders()["Black"]
      ) || EmptyEngineDefinition;

    setLiveEngineData("white", { engineInfo: wEngine });
    setLiveEngineData("black", { engineInfo: bEngine });
  }, [
    cccEvent,
    game.getHeaders()["White"],
    game.getHeaders()["Black"],
    setLiveEngineData,
  ]);

  const handleLiveInfo = useCallback(
    (msg: CCCLiveInfo) => {
      if (ws.current instanceof CCCWebSocket) {
        msg.info.pvSan = uciToSan(game.fen(), msg.info.pv.split(" ")).join(" ");
      }

      const color = msg.info.color as keyof LiveEngineData;
      updateLiveEngineData(color, msg);
    },
    [updateLiveEngineData]
  );

  const handleMessage = useCallback(
    function (msg: CCCMessage) {
      switch (msg.type) {
        case "eventUpdate":
          setEvent(msg);
          break;

        case "gameUpdate": {
          game.loadPgn(msg.gameDetails.pgn);

          // Reset kibitzer live infos
          setLiveEngineData("green", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: cccEvent ? loadLiveInfos(cccEvent, msg) : [],
          });
          setLiveEngineData("blue", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: [],
          });
          setLiveEngineData("red", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: [],
          });

          // Load engine live info
          const { liveInfosBlack, liveInfosWhite } =
            extractLiveInfoFromGame(game);
          setLiveEngineData("white", { liveInfo: liveInfosWhite });
          setLiveEngineData("black", { liveInfo: liveInfosBlack });

          setCurrentMoveNumber(() => -1);
          updateBoard();

          setGame(msg);
          setCurrentFen(game.fen());
          setMoves(game.history());

          break;
        }

        case "liveInfo": {
          handleLiveInfo(msg);
          updateBoard();
          break;
        }

        case "eventsListUpdate":
          setEventList(msg);
          break;

        case "clocks":
          setClocks(() => msg);
          break;

        case "newMove": {
          const from = msg.move.slice(0, 2) as Square;
          const to = msg.move.slice(2, 4) as Square;
          const promo = msg.move?.[4];

          game.move({ from, to, promotion: promo });
          setCurrentFen(game.fen());
          setMoves(game.history());
          updateBoard(true);

          break;
        }

        case "kibitzer":
          setLiveEngineData(msg.color as EngineColor, {
            engineInfo: msg.engine,
          });
          break;

        case "result":
          game.setHeader("Termination", msg.reason);
          game.setHeader("Result", msg.score);
          updateBoard(true);
          break;
      }
    },
    [
      cccEvent,
      handleLiveInfo,
      setCurrentFen,
      setCurrentMoveNumber,
      setEvent,
      setEventList,
      setGame,
      setLiveEngineData,
      updateBoard,
    ]
  );

  const requestEvent = useCallback((gameNr?: string, eventNr?: string) => {
    const message: Record<string, string> = { type: "requestEvent" };
    if (gameNr) message["gameNr"] = gameNr;
    if (eventNr) message["eventNr"] = eventNr;

    ws.current.send(message);
  }, []);

  useEffect(() => {
    if (!ws.current.isConnected()) {
      ws.current.connect(handleMessage);
    } else {
      ws.current.setHandler(handleMessage);
    }
  }, [handleMessage]);

  useEffect(() => {
    const clockTimer = setInterval(updateClocks, CLOCK_UPDATE_MS);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (kibitzerSettings.enableKibitzer) {
      kibitzer.current = [
        new EngineWorker(
          new NativeWorker(kibitzerSettings.hash, kibitzerSettings.threads)
        ),
        new EngineWorker(
          new StockfishWorker(kibitzerSettings.hash, kibitzerSettings.threads)
        ),
      ];
    } else {
      kibitzer.current = [];
    }
    return () => kibitzer.current?.forEach((worker) => worker.terminate());
  }, [kibitzerSettings]);

  const activeKibitzer = kibitzer.current?.find((kibitzer) =>
    kibitzer.isReady()
  );

  useEffect(() => {
    if (!kibitzer.current || !activeKibitzer) return;

    Promise.all(kibitzer.current.map((kibitzer) => kibitzer.stop())).then(
      () => {
        activeKibitzer.onMessage = (result) => {
          if (game.getHeaders()["Event"] === "?") return;
          if (game.fen() != result.fen) return;

          updateLiveEngineData("green", result.liveInfo);
          setLiveEngineData("green", {
            engineInfo: activeKibitzer.getEngineInfo(),
          });

          updateBoard();

          // TODO fix later - we can't stop & restart the kibitzers every time the liveinfos change
          // if (cccEvent && cccGame) {
          //   saveLiveInfos(cccEvent, cccGame, newLiveInfos);
          // }
        };
      }
    );
  }, [
    activeKibitzer,
    cccEvent,
    cccEvent?.tournamentDetails.tNr,
    cccGame,
    cccGame?.gameDetails.gameNr,
    updateLiveEngineData,
    updateBoard,
  ]);

  const _kibitzerId = activeKibitzer?.getID();

  useEffect(() => {
    if (!cccGame?.gameDetails.live || !kibitzerSettings.enableKibitzer) return;

    activeKibitzer?.analyze(currentFen);
  }, [
    _kibitzerId,
    cccGame?.gameDetails.gameNr,
    kibitzerSettings.enableKibitzer,
    cccGame?.gameDetails.live,
    activeKibitzer,
    currentFen,
  ]);

  const pgnHeaders = game.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  useEffect(() => {
    setCurrentFen(game.fenAt(currentMoveNumber));
  }, [currentMoveNumber, setCurrentFen]);

  return (
    <div className="app">
      {popupState !== "none" && (
        <div className="popup">
          {popupState === "crosstable" && cccEvent && (
            <Crosstable requestEvent={requestEvent} />
          )}
          {popupState === "settings" && (
            <Settings
              kibitzerSettings={kibitzerSettings}
              setKibitzerSettings={setKibitzerSettings}
            />
          )}
        </div>
      )}

      <EventListWindow requestEvent={requestEvent} />
      <EngineWindow />
      <div className="boardWindow">
        <EngineMinimal
          color="black"
          className="borderRadiusTop"
        />
        <div className="boardWrapper">
          {Board}

          {termination &&
            result &&
            result !== "*" &&
            (currentMoveNumber === -1 ||
              currentMoveNumber === game.length()) && (
              <GameResultOverlay result={result} termination={termination} />
            )}
        </div>

        <MoveList
          startFen={game.getHeaders()["FEN"] ?? new Chess().fen()}
          moves={moves}
          currentMoveNumber={currentMoveNumber}
          setCurrentMoveNumber={setCurrentMoveNumber}
          downloadURL={
            termination && result && result !== "*"
              ? `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${cccGame?.gameDetails.gameNr}.log`
              : undefined
          }
          controllers={true}
        />
        <EngineMinimal
          color="white"
          className="borderRadiusBottom"
        />
      </div>
      <StandingsWindow />

      <GraphWindow />
      <div className="scheduleWindow">
        <h4>Schedule</h4>
        {cccEvent && cccGame ? (
          <Schedule requestEvent={requestEvent} />
        ) : (
          <div className="sectionSpinner">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
