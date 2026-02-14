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
import { MoveList } from "./components/MoveList";
import { Spinner } from "./components/Loading";
import { NativeWorker } from "./engine/NativeWorker";
import { EngineWorker } from "./engine/EngineWorker";
import { StockfishWorker } from "./engine/StockfishWorker";
import { EngineWindow } from "./components/EngineWindow";
import { EngineMinimal } from "./components/EngineMinimal";
import { Chess960, type Square } from "./chess.js/chess";
import { Chess } from "./chess.js/chess";

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

  const [popupOpen, setPopupOpen] = useState(false);
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

  const currentMoveNumber = useRef(-1);
  const liveInfosRef = useRef({
    white: [] as LiveInfoEntry[],
    black: [] as LiveInfoEntry[],
    kibitzer: [] as LiveInfoEntry[],
  });

  const lastBoardUpdateRef = useRef(new Date().getTime());

  function getCurrentLiveInfos(offset: number = -1) {
    if (liveInfosRef.current.black.at(currentMoveNumber.current)) {
      return {
        liveInfoBlack: liveInfosRef.current.black.at(currentMoveNumber.current),
        liveInfoWhite: liveInfosRef.current.white.at(
          currentMoveNumber.current === -1
            ? -1
            : Math.max(0, currentMoveNumber.current + offset)
        ),
        liveInfoKibitzer: liveInfosRef.current.kibitzer.at(
          currentMoveNumber.current
        ),
      };
    } else {
      return {
        liveInfoBlack: liveInfosRef.current.black.at(
          currentMoveNumber.current === -1
            ? -1
            : Math.max(0, currentMoveNumber.current + offset)
        ),
        liveInfoWhite: liveInfosRef.current.white.at(currentMoveNumber.current),
        liveInfoKibitzer: liveInfosRef.current.kibitzer.at(
          currentMoveNumber.current
        ),
      };
    }
  }

  function updateBoard() {
    const currentTime = new Date().getTime();
    if (currentTime - lastBoardUpdateRef.current <= 50) return;

    const history = game.current.history({ verbose: true });

    let fen = game.current.fen();
    let turn = game.current.turn();
    if (currentMoveNumber.current !== -1) {
      const gameCopy = new Chess960(game.current.getHeaders()["FEN"] ?? new Chess().fen());
      for (let i = 0; i < currentMoveNumber.current; i++) {
        gameCopy.move(history[i].san, { strict: false });
      }
      fen = gameCopy.fen();
      turn = gameCopy.turn();
    }

    const arrows: DrawShape[] = [];

    const { liveInfoBlack, liveInfoKibitzer, liveInfoWhite } =
      getCurrentLiveInfos(game.current.getHeaders()["Termination"] ? 1 : -1);

    if (liveInfoBlack) {
      const pv = liveInfoBlack.info.pv.split(" ");
      const nextMove = turn == "b" ? pv[0] : pv[1];
      if (nextMove && nextMove.length >= 4)
        arrows.push({
          orig: (nextMove.slice(0, 2) as Square) || "a1",
          dest: (nextMove.slice(2, 4) as Square) || "a1",
          brush: liveInfoBlack.info.color,
        });
    }
    if (liveInfoWhite) {
      const pv = liveInfoWhite.info.pv.split(" ");
      const nextMove = turn == "w" ? pv[0] : pv[1];
      if (nextMove && nextMove.length >= 4)
        arrows.push({
          orig: (nextMove.slice(0, 2) as Square) || "a1",
          dest: (nextMove.slice(2, 4) as Square) || "a1",
          brush: liveInfoWhite.info.color,
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
          white: { key: "white", color: "#fff", opacity: 0.7, lineWidth: 10 },
          black: { key: "black", color: "#000", opacity: 0.7, lineWidth: 10 },
          kibitzer: {
            key: "kibitzer",
            color: "#0D47A1",
            opacity: 0.7,
            lineWidth: 10,
          },
        },
        enabled: false,
        eraseOnMovablePieceClick: false,
        shapes: arrows,
      },
      fen,
    };

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

    kibitzer.current = [
      new EngineWorker(new NativeWorker()),
      new EngineWorker(new StockfishWorker()),
    ];

    return () => {
      clearInterval(clockTimer);
      kibitzer.current?.forEach((worker) => worker.terminate());
    };
  }, []);

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
    if (!cccGame?.gameDetails.live) return;

    activeKibitzer?.analyze(fen);
  }, [fen, activeKibitzer?.getID(), cccGame?.gameDetails.gameNr]);

  const { liveInfoBlack, liveInfoKibitzer, liveInfoWhite } =
    getCurrentLiveInfos();

  const engines = useMemo(() => {
    if (!cccEvent?.tournamentDetails?.engines) return [];
    return [...cccEvent.tournamentDetails.engines].sort(
      (a, b) => Number(b.points) - Number(a.points)
    );
  }, [cccEvent]);
  const white = engines.find(
    (engine) => engine.name === game.current.getHeaders()["White"]
  );
  const black = engines.find(
    (engine) => engine.name === game.current.getHeaders()["Black"]
  );

  return (
    <div className="app">
      {popupOpen && (
        <div className="popup">
          {cccEvent && (
            <Crosstable
              engines={engines}
              cccEvent={cccEvent}
              onClose={() => setPopupOpen(false)}
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
        <EventList
          eventList={cccEventList}
          requestEvent={requestEvent}
          selectedEvent={cccEvent}
        />
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
          placeholder={"white"}
          className="borderRadiusBottom"
        />
      </div>

      <div className="movesWindow">
        <h4>Move List</h4>

        {cccGame ? (
          <MoveList
            game={game.current}
            currentMoveNumber={currentMoveNumber.current}
            setCurrentMoveNumber={setCurrentMoveNumber}
          />
        ) : (
          <div className="sectionSpinner">
            <Spinner />
          </div>
        )}
      </div>

      <div className="standingsWindow">
        <h4>Standings</h4>
        {white && black ? (
          <>
            <button onClick={() => setPopupOpen(true)}>Show Crosstable</button>
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
