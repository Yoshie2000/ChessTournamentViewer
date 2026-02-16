import { Chessground } from "@lichess-org/chessground";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CCCWebSocket, type TournamentWebSocket } from "./CCCWebsocket";
import type { Api } from "@lichess-org/chessground/api";
import type {
  CCCMessage,
  CCCEventUpdate,
  CCCEventsListUpdate,
  CCCClocks,
  CCCGameUpdate,
} from "./types";
import type { DrawShape } from "@lichess-org/chessground/draw";
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
import type { Config } from "@lichess-org/chessground/config";
import { Schedule } from "./components/Schedule";
import "./App.css";
import {
  extractLiveInfoFromGame,
  type LiveInfoEntry,
} from "./components/LiveInfo";
import { Crosstable } from "./components/Crosstable";
import { EventList } from "./components/EventList";
import { getGameAtMoveNumber, MoveList } from "./components/MoveList";
import { Spinner } from "./components/Loading";
import { NativeWorker } from "./engine/NativeWorker";
import { type EngineSettings, EngineWorker } from "./engine/EngineWorker";
import { StockfishWorker } from "./engine/StockfishWorker";
import { EngineWindow } from "./components/EngineWindow";
import { EngineMinimal } from "./components/EngineMinimal";
import { Chess960, type Square } from "./chess.js/chess";
import { GameResultOverlay } from "./components/GameResultOverlay";
import { LuSettings } from "react-icons/lu";
import { getDefaultKibitzerSettings, Settings } from "./components/Settings";

const CLOCK_UPDATE_MS = 25;

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
  const boardElementRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Api>(null);
  const game = useRef(new Chess960());
  const ws = useRef<TournamentWebSocket>(new CCCWebSocket());

  const kibitzer = useRef<EngineWorker[]>(null);
  const [fen, setFen] = useState(game.current.fen());

  const [popupState, setPopupState] = useState<string>();
  const [cccEventList, setCccEventList] = useState<CCCEventsListUpdate>();
  const [cccEvent, setCccEvent] = useState<CCCEventUpdate>();
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

  const currentMoveNumber = useRef(-1);
  const liveInfosRef = useRef({
    white: [] as LiveInfoEntry[],
    black: [] as LiveInfoEntry[],
    kibitzer: [] as LiveInfoEntry[],
  });

  const lastBoardUpdateRef = useRef(new Date().getTime());

  function getCurrentLiveInfos() {
    const gameAtTurn = getGameAtMoveNumber(
      game.current,
      currentMoveNumber.current
    );
    const ply =
      2 * gameAtTurn.moveNumber() - (gameAtTurn.turn() === "w" ? 1 : 0) - 1;

    if (liveInfosRef.current.black.at(ply)) {
      const liveInfoBlack = liveInfosRef.current.black.at(
        currentMoveNumber.current
      );
      const liveInfoWhite = liveInfosRef.current.white.at(
        currentMoveNumber.current === -1
          ? -1
          : Math.max(0, currentMoveNumber.current - 1)
      );
      const liveInfoKibitzer =
        liveInfosRef.current.kibitzer.at(
          liveInfoBlack?.info.ply ?? currentMoveNumber.current
        ) ??
        liveInfosRef.current.kibitzer.at(
          liveInfoBlack?.info.ply
            ? liveInfoBlack?.info.ply - 1
            : currentMoveNumber.current
        );
      return { liveInfoBlack, liveInfoWhite, liveInfoKibitzer };
    } else {
      const liveInfoBlack = liveInfosRef.current.black.at(
        currentMoveNumber.current === -1
          ? -1
          : Math.max(0, currentMoveNumber.current - 1)
      );
      const liveInfoWhite = liveInfosRef.current.white.at(
        currentMoveNumber.current
      );
      const liveInfoKibitzer =
        liveInfosRef.current.kibitzer.at(
          liveInfoWhite?.info.ply ?? currentMoveNumber.current
        ) ??
        liveInfosRef.current.kibitzer.at(
          liveInfoWhite?.info.ply
            ? liveInfoWhite?.info.ply - 1
            : currentMoveNumber.current
        );
      return { liveInfoBlack, liveInfoWhite, liveInfoKibitzer };
    }
  }

  function updateBoard(bypass_rate_limit = false) {
    const currentTime = new Date().getTime();
    if (!bypass_rate_limit && currentTime - lastBoardUpdateRef.current <= 50) return;

    const gameAtTurn = getGameAtMoveNumber(
      game.current,
      currentMoveNumber.current
    );
    let fen = gameAtTurn.fen();
    let turn = gameAtTurn.turn();

    const arrows: DrawShape[] = [];

    const { liveInfoBlack, liveInfoKibitzer, liveInfoWhite } =
      getCurrentLiveInfos();

    let moveWhite: string | null = null;
    if (liveInfoWhite) {
      const pv = liveInfoWhite.info.pv.split(" ");
      const nextMove = turn == "w" ? pv[0] : pv[1];
      if (nextMove && nextMove.length >= 4) {
        moveWhite = nextMove;
        arrows.push({
          orig: (nextMove.slice(0, 2) as Square) || "a1",
          dest: (nextMove.slice(2, 4) as Square) || "a1",
          brush: liveInfoWhite.info.color,
        });
      }
    }
    if (liveInfoBlack) {
      const pv = liveInfoBlack.info.pv.split(" ");
      const nextMove = turn == "b" ? pv[0] : pv[1];

      if (nextMove == moveWhite) {
        arrows[0].brush = "agree";
      } else if (nextMove && nextMove.length >= 4)
        arrows.push({
          orig: (nextMove.slice(0, 2) as Square) || "a1",
          dest: (nextMove.slice(2, 4) as Square) || "a1",
          brush: liveInfoBlack.info.color,
        });
    }
    if (liveInfoKibitzer) {
      const pv = liveInfoKibitzer.info.pv.split(" ");
      const nextMove = pv[0];
      if (nextMove && nextMove.length >= 4)
        arrows.push({
          orig: (nextMove.slice(0, 2) as Square) || "a1",
          dest: (nextMove.slice(2, 4) as Square) || "a1",
          brush: "kibitzer",
        });
    }

    let config: Config = {
      drawable: {
        // @ts-ignore
        brushes: {
          white: { key: "white", color: "#fff", opacity: 1, lineWidth: 10 },
          black: { key: "black", color: "#000", opacity: 1, lineWidth: 10 },
          agree: { key: "agree", color: "#43a047", opacity: 1, lineWidth: 10 },
          kibitzer: {
            key: "kibitzer",
            color: "#0D47A1",
            opacity: 0.75,
            lineWidth: 5,
          },
        },
        enabled: false,
        eraseOnMovablePieceClick: false,
        shapes: arrows,
      },
      fen,
    };

    const history = game.current.history({ verbose: true });

    const lastMove =
      currentMoveNumber.current === -1
        ? history.at(-1)
        : history.at(currentMoveNumber.current - 1);
    if (lastMove) config.lastMove = [lastMove.from, lastMove.to];

    boardRef.current?.set(config);
    lastBoardUpdateRef.current = new Date().getTime();
  }

  function updateClocks() {
    setClocks((currentClock) => {
      if (!currentClock) return currentClock;
      if (game.current.getHeaders()["Termination"]) return { ...currentClock };

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
        setCccEvent(msg);
        break;

      case "gameUpdate":
        game.current.loadPgn(msg.gameDetails.pgn);

        const { liveInfosBlack, liveInfosWhite } = extractLiveInfoFromGame(
          game.current
        );
        liveInfosRef.current.white = liveInfosWhite;
        liveInfosRef.current.black = liveInfosBlack;

        const liveInfosKibitzer: LiveInfoEntry[] = [];
        const localStorageID = msg.gameDetails.gameNr + "|";
        for (
          let i = 0;
          i < Math.max(liveInfosBlack.length, liveInfosWhite.length, 500);
          i++
        ) {
          const data = localStorage.getItem(localStorageID + i);
          if (data) liveInfosKibitzer[i] = JSON.parse(data);
        }
        liveInfosRef.current.kibitzer = liveInfosKibitzer;

        currentMoveNumber.current = -1;
        updateBoard();

        setCccGame(msg);
        setFen(game.current.fen());

        break;

      case "liveInfo":
        if (msg.info.color == "white") {
          const newLiveInfos = [...liveInfosRef.current.white];
          newLiveInfos[msg.info.ply] = msg;
          liveInfosRef.current.white = newLiveInfos;
        } else {
          const newLiveInfos = [...liveInfosRef.current.black];
          newLiveInfos[msg.info.ply] = msg;
          liveInfosRef.current.black = newLiveInfos;
        }

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
        updateBoard();

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
    (moveNumber: number) => {
      currentMoveNumber.current = moveNumber;
      updateBoard();
    },
    [game.current.moves().length]
  ); // required for MoveList to re-render correctly

  useEffect(() => {
    if (boardRef.current || !boardElementRef.current) return;

    boardRef.current = Chessground(boardElementRef.current, {
      fen: game.current.fen(),
      orientation: "white",
      movable: { free: false, color: undefined, dests: undefined },
      selectable: { enabled: false },
    });

    ws.current.disconnect();
    ws.current.connect(handleMessage);
  }, [boardElementRef.current]);

  useEffect(() => {
    const clockTimer = setInterval(updateClocks, CLOCK_UPDATE_MS);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    kibitzer.current = [
      new EngineWorker(
        new NativeWorker(kibitzerSettings.hash, kibitzerSettings.threads)
      ),
      new EngineWorker(
        new StockfishWorker(kibitzerSettings.hash, kibitzerSettings.threads)
      ),
    ];
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

          updateBoard();

          if (cccEvent && cccGame)
            localStorage.setItem(
              cccGame.gameDetails.gameNr + "|" + result.liveInfo.info.ply,
              JSON.stringify(result.liveInfo)
            );

          const newLiveInfos = [...liveInfosRef.current.kibitzer];
          newLiveInfos[result.liveInfo.info.ply] = result.liveInfo;
          liveInfosRef.current.kibitzer = newLiveInfos;
        };
      }
    );
  }, [
    activeKibitzer?.getID(),
    cccEvent?.tournamentDetails.tNr,
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

  const { liveInfoBlack, liveInfoKibitzer, liveInfoWhite } =
    getCurrentLiveInfos();

  const engines = useMemo(() => {
    if (!cccEvent?.tournamentDetails?.engines) return [];

    return cccEvent.tournamentDetails.engines
      .map((engine) => {
        const playedGames = cccEvent.tournamentDetails.schedule.past.filter(
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
        const perf = 100 * points / playedGames.length;
        return { ...engine, perf: perf.toFixed(1), points: points.toFixed(1) };
      })
      .sort((a, b) => Number(b.points) - Number(a.points));
  }, [cccEvent]);

  const white = engines.find(
    (engine) => engine.name === game.current.getHeaders()["White"]
  );
  const black = engines.find(
    (engine) => engine.name === game.current.getHeaders()["Black"]
  );

  const pgnHeaders = game.current.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ?? pgnHeaders["Termination"];
  const result = pgnHeaders["Result"];

  return (
    <div className="app">
      {popupState && (
        <div className="popup">
          {popupState === "crosstable" && cccEvent && (
            <Crosstable
              engines={engines}
              cccEvent={cccEvent}
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
          {cccEvent?.tournamentDetails.name
            ? " - " + cccEvent?.tournamentDetails.name
            : ""}
        </div>
        <div className="settingsRow">
          <EventList
            eventList={cccEventList}
            requestEvent={requestEvent}
            selectedEvent={cccEvent}
          />
          <button onClick={() => setPopupState("settings")}>
            <LuSettings />
          </button>
        </div>
      </div>

      <EngineWindow
        white={white}
        black={black}
        latestLiveInfoWhite={liveInfoWhite}
        latestLiveInfoBlack={liveInfoBlack}
        latestLiveInfoKibitzer={liveInfoKibitzer}
        clocks={clocks}
        activeKibitzerInfo={activeKibitzer?.getEngineInfo()}
      />

      <div className="boardWindow">
        <EngineMinimal
          engine={black}
          info={liveInfoBlack}
          time={Number(clocks?.btime ?? 0)}
          placeholder={"Black"}
          className="borderRadiusTop"
        />
        <div ref={boardElementRef} className="board"></div>
        <EngineMinimal
          engine={white}
          info={liveInfoWhite}
          time={Number(clocks?.wtime ?? 0)}
          placeholder={"White"}
          className="borderRadiusBottom"
        />

        {termination && result && currentMoveNumber.current === -1 && (
          <GameResultOverlay result={result} termination={termination} />
        )}
      </div>

      <div className="movesWindow">
        <h4>Move List</h4>

        {cccGame ? (
          <MoveList
            game={game.current}
            currentMoveNumber={currentMoveNumber.current}
            setCurrentMoveNumber={setCurrentMoveNumber}
            cccGameId={cccGame.gameDetails.gameNr}
          />
        ) : (
          <div className="sectionSpinner">
            <Spinner />
          </div>
        )}
      </div>

      <div className="standingsWindow">
        <h4>Standings</h4>
        {white && black && cccEvent ? (
          <>
            <button onClick={() => setPopupState("crosstable")}>
              Show Crosstable
            </button>
            <StandingsTable engines={engines} />
          </>
        ) : (
          <div className="sectionSpinner">
            <Spinner />
          </div>
        )}
      </div>

      <div className="graphWindow">
        {black && white ? (
          <GameGraph
            black={black}
            white={white}
            liveInfosBlack={liveInfosRef.current.black}
            liveInfosWhite={liveInfosRef.current.white}
            liveInfosKibitzer={liveInfosRef.current.kibitzer}
            setCurrentMoveNumber={setCurrentMoveNumber}
            currentMoveNumber={currentMoveNumber.current}
          />
        ) : (
          <>
            <h4>Game Graph</h4>
            <div className="sectionSpinner">
              <Spinner />
            </div>
          </>
        )}
      </div>

      <div className="scheduleWindow">
        <h4>Schedule</h4>
        {cccEvent && cccGame && cccEventList ? (
          <Schedule
            event={cccEvent}
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
