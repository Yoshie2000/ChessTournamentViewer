import { useCallback, useEffect, useRef, useState } from "react";
import { CCCWebSocket, type TournamentWebSocket } from "./CCCWebsocket";
import type { CCCMessage, CCCClocks, CCCLiveInfo } from "./types";
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
  type LiveEngineDataObject,
  type EngineColor,
  getLiveInfosForMove,
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
import { TCECSocket } from "./TCECWebsocket";
import { MoveList } from "./components/MoveList";
import { loadLiveInfos, saveLiveInfos } from "./LocalStorage";
import { uciToSan } from "./utils";
import { useLiveInfo } from "./context/LiveInfoContext";
import { useEventStore } from "./context/EventContext";
import { EventListWindow } from "./components/EventList/EventList";
import { GraphWindow } from "./components/GraphWindow/GraphWindow";
import { StandingsWindow } from "./components/StandingsWindow/StandingsWindow";
import { usePopup } from "./components/Popup/PopupContext";
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

const _initialWS = isTCEC ? new TCECSocket() : new CCCWebSocket();

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

  const liveEngineData = useLiveInfo((state) => state.liveEngineData);
  const setLiveEngineData = useLiveInfo((state) => state.setLiveEngineData);
  const liveInfos = useLiveInfo((state) => state.liveInfos);
  const setLiveInfos = useLiveInfo((state) => state.setLiveInfos);

  const popupState = usePopup((state) => state.popupState);

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

  const { Board, currentFen, setCurrentFen, game, updateBoard } = useLiveBoard({
    animated: true,
    id: "main-board",
  });

  useEffect(() => {
    updateBoard();
  }, [updateBoard]);

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

  useEffect(() => {
    if (!cccEvent) {
      return;
    }

    const wEngine =
      cccEvent.tournamentDetails.engines.find(
        (engine) => engine.name === game.current.getHeaders()["White"]
      ) || EmptyEngineDefinition;

    const bEngine =
      cccEvent.tournamentDetails.engines.find(
        (engine) => engine.name === game.current.getHeaders()["Black"]
      ) || EmptyEngineDefinition;

    const { liveInfosBlack, liveInfosWhite } = extractLiveInfoFromGame(
      game.current
    );

    const wData: LiveEngineDataObject = {
      engineInfo: wEngine,
      liveInfo: liveInfosWhite,
    };

    const bData: LiveEngineDataObject = {
      engineInfo: bEngine,
      liveInfo: liveInfosBlack,
    };

    setLiveEngineData("white", wData);
    setLiveEngineData("black", bData);
  }, [cccEvent, cccGame, setLiveEngineData]);

  const handleLiveInfo = useCallback(
    (msg: CCCLiveInfo) => {
      if (ws.current instanceof CCCWebSocket) {
        msg.info.pvSan = uciToSan(
          game.current.fen(),
          msg.info.pv.split(" ")
        ).join(" ");
      }

      const color = msg.info.color as keyof LiveEngineData;
      const newLiveInfos = [...liveEngineData[color].liveInfo];
      newLiveInfos[msg.info.ply] = msg;

      setLiveEngineData(color, { liveInfo: newLiveInfos });
    },
    [liveEngineData, setLiveEngineData]
  );

  const handleMessage = useCallback(
    function (msg: CCCMessage) {
      switch (msg.type) {
        case "eventUpdate":
          setEvent(msg);

          break;

        case "gameUpdate": {
          game.current.loadPgn(msg.gameDetails.pgn);

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

          setCurrentMoveNumber(() => -1);

          updateBoard();

          setGame(msg);
          setCurrentFen(game.current.fen());
          setMoves(game.current.history());

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
          setClocks(msg);
          break;

        case "newMove": {
          const from = msg.move.slice(0, 2) as Square;
          const to = msg.move.slice(2, 4) as Square;
          const promo = msg.move?.[4];

          game.current.move({ from, to, promotion: promo });
          setCurrentFen(game.current.fen());
          setMoves(game.current.history());
          updateBoard(true);

          break;
        }

        case "kibitzer":
          setLiveEngineData(msg.color as EngineColor, {
            engineInfo: msg.engine,
          });

          break;

        case "result":
          game.current.setHeader("Termination", msg.reason);
          game.current.setHeader("Result", msg.score);
          updateBoard(true);
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
    if (isTCEC) {
      const isSocketIOSocket = ws.current instanceof TCECSocket;
      if (!isSocketIOSocket) {
        return;
      }

      const wsInstance = ws.current;

      if (!wsInstance.socket) {
        wsInstance.connect(handleMessage);
      } else {
        wsInstance.setHandler(handleMessage);
      }

      return;
    }

    const wsInstance = ws.current as CCCWebSocket;

    if (
      !wsInstance.socket ||
      wsInstance.socket.readyState === wsInstance.socket.CLOSING ||
      wsInstance.socket.readyState === wsInstance.socket.CLOSED ||
      wsInstance.socket.readyState === undefined
    ) {
      wsInstance.connect(handleMessage);
    } else if (
      wsInstance.socket.readyState === wsInstance.socket.OPEN ||
      wsInstance.socket.readyState === wsInstance.socket.CONNECTING
    ) {
      wsInstance.setHandler(handleMessage);
    }

    return () => {
      // wsInstance.disconnect();
    };
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
          if (game.current.getHeaders()["Event"] === "?") return;
          if (game.current.fen() != result.fen) return;

          const newLiveInfos = [...liveEngineData.green.liveInfo];
          newLiveInfos[result.liveInfo.info.ply] = result.liveInfo;

          setLiveEngineData("green", {
            engineInfo: activeKibitzer.getEngineInfo(),
            liveInfo: newLiveInfos,
          });

          updateBoard();

          if (cccEvent && cccGame) {
            saveLiveInfos(cccEvent, cccGame, newLiveInfos);
          }
        };
      }
    );
  }, [
    liveEngineData.green.liveInfo,
    activeKibitzer,
    cccEvent,
    cccEvent?.tournamentDetails.tNr,
    cccGame,
    cccGame?.gameDetails.gameNr,
    setLiveEngineData,
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

  useEffect(() => {
    const { white, black, blue, green, red } = getLiveInfosForMove(
      liveEngineData,
      currentMoveNumber,
      game.current.turnAt(currentMoveNumber)
    );
    setLiveInfos("white", white);
    setLiveInfos("black", black);
    setLiveInfos("blue", blue);
    setLiveInfos("green", green);
    setLiveInfos("red", red);
  }, [setLiveInfos, liveEngineData, currentMoveNumber, currentFen]);

  const pgnHeaders = game.current.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  useEffect(() => {
    setCurrentFen(game.current.fenAt(currentMoveNumber));
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
          {Board}

          {termination &&
            result &&
            result !== "*" &&
            (currentMoveNumber === -1 ||
              currentMoveNumber === game.current.length()) && (
              <GameResultOverlay result={result} termination={termination} />
            )}
        </div>

        <MoveList
          startFen={game.current.getHeaders()["FEN"] ?? new Chess().fen()}
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
          info={liveInfos.white.liveInfo}
          time={Number(clocks?.wtime ?? 0)}
          placeholder={"White"}
          engine={liveInfos.white.engineInfo}
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
