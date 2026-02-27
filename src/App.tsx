import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CCCWebSocket, type TournamentWebSocket } from "./CCCWebsocket";
import type {
  CCCMessage,
  CCCEventUpdate,
  CCCEventsListUpdate,
  CCCClocks,
  CCCGameUpdate,
} from "./types";
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
import { StandingsTable } from "./components/StandingsTable";
import { GameGraph } from "./components/GameGraph";
import { Schedule } from "./components/Schedule";
import "./App.css";
import "./components/Popup.css";
import {
  extractLiveInfoFromGame,
  type LiveInfoEntry,
  type LiveEngineDataEntry,
  type LiveEngineData,
  EmptyEngineDefinition,
} from "./LiveInfo";
import { Crosstable } from "./components/Crosstable";
import { EventList } from "./components/EventList";
import { Spinner } from "./components/Loading";
import { NativeWorker } from "./engine/NativeWorker";
import { type EngineSettings, EngineWorker } from "./engine/EngineWorker";
import { StockfishWorker } from "./engine/StockfishWorker";
import { EngineWindow } from "./components/EngineWindow";
import { EngineMinimal } from "./components/EngineMinimal";
import { Chess, Chess960, type Square } from "./chess.js/chess";
import { GameResultOverlay } from "./components/GameResultOverlay";
import { LuSettings } from "react-icons/lu";
import { getDefaultKibitzerSettings, Settings } from "./components/Settings";
import { TCECSocket } from "./TCECWebsocket";
import { Board, type BoardHandle } from "./components/Board";
import { MoveList } from "./components/MoveList";
import { loadLiveInfos, saveLiveInfos } from "./LocalStorage";
import { uciToSan } from "./utils";

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

function App() {
  const boardHandle = useRef<BoardHandle>(null);
  const game = useRef(new Chess960());
  const ws = useRef<TournamentWebSocket>(
    window.location.search.includes("tcec")
      ? new TCECSocket()
      : new CCCWebSocket()
  );

  const kibitzer = useRef<EngineWorker[]>(null);
  const [fen, setFen] = useState(game.current.fen());
  const [moves, setMoves] = useState<string[]>([]);

  const [popupState, setPopupState] = useState<string>();
  const [cccEventList, setCccEventList] = useState<CCCEventsListUpdate>();
  const cccEvent = useRef<CCCEventUpdate>(undefined);
  const [cccGame, setCccGame] = useState<CCCGameUpdate>();
  const [clocks, setClocks] = useState<CCCClocks>({
    binc: "0",
    winc: "0",
    btime: "0",
    wtime: "0",
    type: "clocks",
  });

  const [kibitzerSettings, setKibitzerSettings] = useState<EngineSettings>(
    getDefaultKibitzerSettings()
  );
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const currentMoveNumber = useRef(-1);
  const liveInfosRef = useRef<LiveEngineData>({
    white: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
    black: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
    red: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
    blue: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
    green: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
  });

  function getCurrentLiveInfos(): LiveEngineDataEntry {
    const moveNumber =
      currentMoveNumber.current === game.current.length()
        ? -1
        : currentMoveNumber.current;

    const index = moveNumber === -1 ? game.current.length() - 2 : moveNumber;
    const turn = game.current.turnAt(index);

    function kibitzer(base: LiveInfoEntry, color: "red" | "green" | "blue") {
      const array = liveInfosRef.current[color].liveInfo;
      return {
        engineInfo: liveInfosRef.current[color].engineInfo,
        liveInfo:
          array.at(base?.info.ply ?? moveNumber) ??
          array.at(base?.info.ply ? base?.info.ply - 1 : moveNumber),
      };
    }

    if (turn === "w") {
      const white = liveInfosRef.current.white.liveInfo.at(moveNumber);
      const black = liveInfosRef.current.black.liveInfo.at(
        moveNumber === -1 ? -1 : Math.max(0, moveNumber - 1)
      );

      return {
        black: {
          liveInfo: black,
          engineInfo: liveInfosRef.current.black.engineInfo,
        },
        white: {
          liveInfo: white,
          engineInfo: liveInfosRef.current.white.engineInfo,
        },
        green: kibitzer(white, "green"),
        red: kibitzer(white, "red"),
        blue: kibitzer(white, "blue"),
      };
    } else {
      const white = liveInfosRef.current.white.liveInfo.at(
        moveNumber === -1 ? -1 : Math.max(0, moveNumber - 1)
      );
      const black = liveInfosRef.current.black.liveInfo.at(moveNumber);

      return {
        black: {
          liveInfo: black,
          engineInfo: liveInfosRef.current.black.engineInfo,
        },
        white: {
          liveInfo: white,
          engineInfo: liveInfosRef.current.white.engineInfo,
        },
        green: kibitzer(black, "green"),
        red: kibitzer(black, "red"),
        blue: kibitzer(black, "blue"),
      };
    }
  }

  function updateBoard(bypassRateLimit: boolean = false) {
    boardHandle.current?.updateBoard(
      game.current,
      currentMoveNumber.current,
      getCurrentLiveInfos(),
      bypassRateLimit
    );
  }

  function updateClocks() {
    setClocks((currentClock) => {
      if (!currentClock) return currentClock;
      const result = game.current.getHeaders()["Result"];
      if (result && result !== "*") return { ...currentClock };

      let wtime = Number(currentClock.wtime);
      let btime = Number(currentClock.btime);

      if (game.current.turn() == "w") wtime -= CLOCK_UPDATE_MS;
      else btime -= CLOCK_UPDATE_MS;

      return { ...currentClock, wtime: String(wtime), btime: String(btime) };
    });
  }

  function handleMessage(msg: CCCMessage) {
    switch (msg.type) {
      case "eventUpdate":
        cccEvent.current = msg;
        break;

      case "gameUpdate":
        game.current.loadPgn(msg.gameDetails.pgn);

        const { liveInfosBlack, liveInfosWhite } = extractLiveInfoFromGame(
          game.current
        );
        liveInfosRef.current.white.liveInfo = liveInfosWhite;
        liveInfosRef.current.white.engineInfo =
          cccEvent.current?.tournamentDetails.engines.find(
            (engine) => engine.name === game.current.getHeaders()["White"]
          )!;
        liveInfosRef.current.black.liveInfo = liveInfosBlack;
        liveInfosRef.current.black.engineInfo =
          cccEvent.current?.tournamentDetails.engines.find(
            (engine) => engine.name === game.current.getHeaders()["Black"]
          )!;

        liveInfosRef.current.green.liveInfo = cccEvent.current
          ? loadLiveInfos(cccEvent.current, msg)
          : [];
        liveInfosRef.current.blue.liveInfo = [];
        liveInfosRef.current.red.liveInfo = [];

        currentMoveNumber.current = -1;
        updateBoard();

        setCccGame(msg);
        setFen(game.current.fen());
        setMoves(game.current.history());

        break;

      case "liveInfo":
        if (ws.current instanceof CCCWebSocket) {
          msg.info.pvSan = uciToSan(
            game.current.fen(),
            msg.info.pv.split(" ")
          ).join(" ");
        }

        const color = msg.info.color as keyof LiveEngineData;
        const newLiveInfos = [...liveInfosRef.current[color].liveInfo];
        newLiveInfos[msg.info.ply] = msg;
        liveInfosRef.current[color].liveInfo = newLiveInfos;

        updateBoard();
        break;

      case "eventsListUpdate":
        setCccEventList(msg);
        break;

      case "clocks":
        setClocks(msg);
        break;

      case "newMove":
        const from = msg.move.slice(0, 2) as Square;
        const to = msg.move.slice(2, 4) as Square;
        const promo = msg.move?.[4];

        game.current.move({ from, to, promotion: promo as any });
        setFen(game.current.fen());
        setMoves(game.current.history());
        updateBoard(true);

        break;

      case "kibitzer":
        liveInfosRef.current[msg.color as keyof LiveEngineData].engineInfo =
          msg.engine;
        break;

      case "result":
        game.current.setHeader("Termination", msg.reason);
        game.current.setHeader("Result", msg.score);
        updateBoard(true);
    }
  }

  const requestEvent = useCallback((gameNr?: string, eventNr?: string) => {
    let message: any = { type: "requestEvent" };
    if (gameNr) message["gameNr"] = gameNr;
    if (eventNr) message["eventNr"] = eventNr;

    ws.current.send(message);
  }, []);

  const setCurrentMoveNumber = useCallback(
    (callback: (previous: number) => number) => {
      currentMoveNumber.current = callback(currentMoveNumber.current);
      updateBoard(true);
    },
    []
  );

  useEffect(() => {
    ws.current.disconnect();
    ws.current.connect(handleMessage);
  }, []);

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
          if (game.current.getHeaders()["Event"] === "?") return;
          if (game.current.fen() != result.fen) return;

          liveInfosRef.current.green.engineInfo =
            activeKibitzer.getEngineInfo();

          const newLiveInfos = [...liveInfosRef.current.green.liveInfo];
          newLiveInfos[result.liveInfo.info.ply] = result.liveInfo;
          liveInfosRef.current.green.liveInfo = newLiveInfos;

          updateBoard();

          if (cccEvent.current && cccGame)
            saveLiveInfos(cccEvent.current, cccGame, newLiveInfos);
        };
      }
    );
  }, [
    activeKibitzer?.getID(),
    cccEvent.current?.tournamentDetails.tNr,
    cccGame?.gameDetails.gameNr,
  ]);

  useEffect(() => {
    if (!cccGame?.gameDetails.live || !kibitzerSettings.enableKibitzer) return;

    activeKibitzer?.analyze(fen);
  }, [
    fen,
    activeKibitzer?.getID(),
    cccGame?.gameDetails.gameNr,
    kibitzerSettings.enableKibitzer,
  ]);

  const liveInfos = getCurrentLiveInfos();

  const engines = useMemo(() => {
    if (!cccEvent.current?.tournamentDetails?.engines) return [];

    return cccEvent.current.tournamentDetails.engines
      .map((engine) => {
        const playedGames =
          cccEvent.current!.tournamentDetails.schedule.past.filter(
            (game) => game.blackId === engine.id || game.whiteId === engine.id
          );
        const points = playedGames.reduce((prev, cur) => {
          if (cur.blackId === engine.id) {
            switch (cur.outcome) {
              case "1-0":
                return prev + 0.0;
              case "0-1":
                return prev + 1.0;
              case "1/2-1/2":
                return prev + 0.5;
              default:
                return prev;
            }
          } else {
            switch (cur.outcome) {
              case "0-1":
                return prev + 0.0;
              case "1-0":
                return prev + 1.0;
              case "1/2-1/2":
                return prev + 0.5;
              default:
                return prev;
            }
          }
        }, 0);
        const perf = (100 * points) / playedGames.length;
        return { ...engine, perf: perf.toFixed(1), points: points.toFixed(1) };
      })
      .sort((a, b) => Number(b.perf) - Number(a.perf));
  }, [cccEvent.current]);

  const pgnHeaders = game.current.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  const currentFen = game.current.fenAt(currentMoveNumber.current);

  return (
    <div className="app">
      {popupState && (
        <div className="popup">
          {popupState === "crosstable" && cccEvent.current && (
            <Crosstable
              engines={engines}
              cccEvent={cccEvent.current}
              onClose={() => setPopupState(undefined)}
            />
          )}
          {popupState === "settings" && (
            <Settings
              kibitzerSettings={kibitzerSettings}
              setKibitzerSettings={setKibitzerSettings}
              onClose={() => setPopupState(undefined)}
            />
          )}
        </div>
      )}

      <div className="topBar">
        <div className="currentEvent">
          Chess Tournament Viewer
          {cccEvent.current?.tournamentDetails.name
            ? " - " + cccEvent.current?.tournamentDetails.name
            : ""}
        </div>
        <div className="settingsRow">
          <EventList
            eventList={cccEventList}
            requestEvent={requestEvent}
            selectedEvent={cccEvent.current}
          />
          <button onClick={() => setPopupState("settings")}>
            <LuSettings />
          </button>
        </div>
      </div>

      <EngineWindow liveInfos={liveInfos} clocks={clocks} fen={currentFen} />

      <div className="boardWindow">
        <EngineMinimal
          info={liveInfos.black.liveInfo}
          time={Number(clocks?.btime ?? 0)}
          placeholder={"Black"}
          engine={liveInfos.black.engineInfo}
          className="borderRadiusTop"
        />
        <div className="boardWrapper">
          <Board id="main-board" ref={boardHandle} animated={true} />

          {termination &&
            result &&
            result !== "*" &&
            (currentMoveNumber.current === -1 ||
              currentMoveNumber.current === game.current.length()) && (
              <GameResultOverlay result={result} termination={termination} />
            )}
        </div>

        <MoveList
          startFen={game.current.getHeaders()["FEN"] ?? new Chess().fen()}
          moves={moves}
          currentMoveNumber={currentMoveNumber.current}
          setCurrentMoveNumber={setCurrentMoveNumber}
          downloadURL={
            termination && result && result !== "*"
              ? `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${cccGame?.gameDetails.gameNr}.log`
              : undefined
          }
          controllers={true}
        />
        <EngineMinimal
          info={liveInfos.white.liveInfo}
          time={Number(clocks?.wtime ?? 0)}
          placeholder={"White"}
          engine={liveInfos.white.engineInfo}
          className="borderRadiusBottom"
        />
      </div>

      <div className="standingsWindow">
        <h4>Standings</h4>
        {cccEvent.current && cccGame ? (
          <>
            <button onClick={() => setPopupState("crosstable")}>
              Show Crosstable
            </button>
            <StandingsTable engines={engines} cccEvent={cccEvent.current} />
          </>
        ) : (
          <div className="sectionSpinner">
            <Spinner />
          </div>
        )}
      </div>

      <div className="graphWindow">
        {cccEvent && cccGame ? (
          <GameGraph
            liveInfosWhite={liveInfosRef.current.white.liveInfo}
            liveInfosBlack={liveInfosRef.current.black.liveInfo}
            liveInfosGreen={liveInfosRef.current.green.liveInfo}
            liveInfosRed={liveInfosRef.current.red.liveInfo}
            liveInfosBlue={liveInfosRef.current.blue.liveInfo}
            setCurrentMoveNumber={setCurrentMoveNumber}
            currentMoveNumber={currentMoveNumber.current}
            reducedMotion={prefersReducedMotion}
          />
        ) : (
          <>
            <div className="sectionSpinner">
              <Spinner />
            </div>
          </>
        )}
      </div>

      <div className="scheduleWindow">
        <h4>Schedule</h4>
        {cccEvent.current && cccGame ? (
          <Schedule
            event={cccEvent.current}
            engines={engines}
            requestEvent={requestEvent}
            selectedGame={cccGame}
          />
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
