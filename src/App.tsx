import { Chessground } from "@lichess-org/chessground";
import { Chess, Move, type Square } from "chess.js";
import { useEffect, useRef, useState } from "react";
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
import { EngineCard } from "./components/EngineCard";
import { StandingsTable } from "./components/StandingsTable";
import { GameGraph } from "./components/GameGraph";
import type { Config } from "@lichess-org/chessground/config";
import { Schedule } from "./components/Schedule";
import {
  StockfishEngineDefinition,
  StockfishWorker,
} from "./components/StockfishWorker";
import "./App.css";
import {
  emptyLiveInfo,
  extractLiveInfoFromGame,
  type LiveInfoEntry,
} from "./components/LiveInfo";
import { Crosstable } from "./components/Crosstable";
import { EventList } from "./components/EventList";
import { MoveList } from "./components/MoveList";
import { Spinner } from "./components/Loading";

const CLOCK_UPDATE_MS = 25;

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

function App() {
  const boardElementRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Api>(null);
  const whiteArrow = useRef<[DrawShape, DrawShape]>(null);
  const blackArrow = useRef<[DrawShape, DrawShape]>(null);
  const stockfishArrow = useRef<DrawShape>(null);
  const game = useRef(new Chess());
  const ws = useRef<TournamentWebSocket>(new CCCWebSocket());

  const stockfish = useRef<StockfishWorker>(null);
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

  const [liveInfosWhite, setLiveInfosWhite] = useState<LiveInfoEntry[]>([]);
  const [liveInfosBlack, setLiveInfosBlack] = useState<LiveInfoEntry[]>([]);
  const [liveInfosStockfish, setLiveInfosStockfish] = useState<LiveInfoEntry[]>(
    [],
  );

  function updateBoard(
    lastMove: [Square, Square],
    arrowsOnly: boolean = false,
  ) {
    const arrows: DrawShape[] = [];
    if (whiteArrow.current) arrows.push(whiteArrow.current[0]);
    if (blackArrow.current) arrows.push(blackArrow.current[0]);
    if (stockfishArrow.current) arrows.push(stockfishArrow.current);

    let config: Config = {
      drawable: {
        // @ts-ignore
        brushes: {
          white: {
            key: "white",
            color: "#fff",
            opacity: 0.7,
            lineWidth: 10,
          },
          black: {
            key: "black",
            color: "#000",
            opacity: 0.7,
            lineWidth: 10,
          },
          stockfish: {
            key: "stockfish",
            color: "#0D47A1",
            opacity: 0.7,
            lineWidth: 10,
          },
        },
        enabled: false,
        eraseOnMovablePieceClick: false,
        shapes: arrows,
      },
    };

    if (!arrowsOnly) {
      config.fen = game.current.fen();
      config.lastMove = lastMove;
    }

    setFen(game.current.fen());
    boardRef.current?.set(config);
  }

  function updateClocks() {
    setClocks((currentClock) => {
      if (!currentClock) return currentClock;
      if (game.current.getHeaders()["Termination"]) return currentClock;

      let wtime = Number(currentClock.wtime);
      let btime = Number(currentClock.btime);

      if (game.current.turn() == "w") wtime -= CLOCK_UPDATE_MS;
      else btime -= CLOCK_UPDATE_MS;

      return {
        ...currentClock,
        wtime: String(wtime),
        btime: String(btime),
      };
    });
  }

  function handleMessage(msg: CCCMessage) {
    let lastMove: Move;

    switch (msg.type) {
      case "eventUpdate":
        setCccEvent(msg);
        break;

      case "gameUpdate":
        whiteArrow.current = null;
        blackArrow.current = null;
        stockfishArrow.current = null;

        setCccGame(msg);

        game.current.loadPgn(msg.gameDetails.pgn);
        lastMove = game.current.history({ verbose: true }).at(-1)!!;
        updateBoard([lastMove.from, lastMove.to]);

        const { liveInfosBlack, liveInfosWhite } = extractLiveInfoFromGame(
          game.current,
        );
        setLiveInfosWhite(liveInfosWhite);
        setLiveInfosBlack(liveInfosBlack);

        const liveInfosStockfish: LiveInfoEntry[] = [];
        const localStorageID = msg.gameDetails.gameNr + "|";
        for (
          let i = 0;
          i < Math.max(liveInfosBlack.length, liveInfosWhite.length, 500);
          i++
        ) {
          const data = localStorage.getItem(localStorageID + i);
          if (data) liveInfosStockfish[i] = JSON.parse(data);
        }
        setLiveInfosStockfish(liveInfosStockfish);

        break;

      case "liveInfo":
        const pv = msg.info.pv.split(" ");
        const nextMove = pv[0];
        const secondNextMove = pv.length > 1 ? pv[1] : pv[0];
        const arrow: [DrawShape, DrawShape] | null =
          nextMove.length >= 4 && secondNextMove.length >= 4
            ? [
                {
                  orig: (nextMove.slice(0, 2) as Square) || "a1",
                  dest: (nextMove.slice(2, 4) as Square) || "a1",
                  brush: msg.info.color,
                },
                {
                  orig: (secondNextMove.slice(0, 2) as Square) || "a1",
                  dest: (secondNextMove.slice(2, 4) as Square) || "a1",
                  brush: msg.info.color,
                },
              ]
            : null;

        if (msg.info.color == "white") {
          setLiveInfosWhite((data) => {
            const newData = [...data];
            newData[msg.info.ply] = msg;
            return newData;
          });
          whiteArrow.current = arrow;
        } else {
          setLiveInfosBlack((data) => {
            const newData = [...data];
            newData[msg.info.ply] = msg;
            return newData;
          });
          blackArrow.current = arrow;
        }

        lastMove = game.current.history({ verbose: true }).at(-1)!!;
        updateBoard([lastMove.from, lastMove.to], true);

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

        if (game.current.turn() == "w" && whiteArrow.current) {
          whiteArrow.current = [whiteArrow.current[1], whiteArrow.current[0]];
        } else if (blackArrow.current) {
          blackArrow.current = [blackArrow.current[1], blackArrow.current[0]];
        }

        game.current.move({ from, to, promotion: promo as any });
        updateBoard([from, to]);

        break;
    }
  }

  function requestEvent(gameNr?: string, eventNr?: string) {
    let message: any = { type: "requestEvent" };
    if (gameNr) message["gameNr"] = gameNr;
    if (eventNr) message["eventNr"] = eventNr;

    ws.current.send(message);
  }

  useEffect(() => {
    if (boardRef.current || !boardElementRef.current) return;

    boardRef.current = Chessground(boardElementRef.current, {
      fen: game.current.fen(),
      orientation: "white",
      movable: { free: false, color: undefined, dests: undefined },
      selectable: { enabled: false },
    });

    ws.current.connect(handleMessage);
    // return () => ws.current.disconnect()
  }, [boardElementRef.current]);

  useEffect(() => {
    const clockTimer = setInterval(updateClocks, CLOCK_UPDATE_MS);

    stockfish.current = new StockfishWorker();

    return () => {
      clearInterval(clockTimer);
      stockfish.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!stockfish.current) return;

    stockfish.current.onMessage = (result) => {
      if (game.current.getHeaders()["Event"] === "?") return;
      if (game.current.fen() != result.fen) return;

      stockfishArrow.current = result.arrow;
      updateBoard(["a1", "a1"], true);

      if (cccEvent && cccGame)
        localStorage.setItem(
          cccGame.gameDetails.gameNr + "|" + result.liveInfo.info.ply,
          JSON.stringify(result.liveInfo),
        );

      setLiveInfosStockfish((data) => {
        const newData = [...data];
        newData[result.liveInfo.info.ply] = result.liveInfo;
        return newData;
      });
    };
    stockfish.current.analyze(fen);
  }, [fen]);

  const latestLiveInfoBlack = liveInfosBlack.at(-1) ?? emptyLiveInfo();
  const latestLiveInfoWhite = liveInfosWhite.at(-1) ?? emptyLiveInfo();
  const latestLiveInfoStockfish = liveInfosStockfish.at(-1) ?? emptyLiveInfo();

  const engines =
    (cccEvent?.tournamentDetails.engines ?? []).sort(
      (a, b) => Number(b.points) - Number(a.points),
    ) ?? [];
  const white = engines.find(
    (engine) => engine.name === game.current.getHeaders()["White"],
  );
  const black = engines.find(
    (engine) => engine.name === game.current.getHeaders()["Black"],
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

      <div className="engineWindow">
        <EngineCard
          engine={black}
          info={latestLiveInfoBlack}
          time={Number(clocks?.btime ?? 0)}
          placeholder={"Black"}
        />

        <EngineCard
          engine={StockfishEngineDefinition}
          info={latestLiveInfoStockfish}
          time={0}
          placeholder={"Stockfish"}
        />

        <EngineCard
          engine={white}
          info={latestLiveInfoWhite}
          time={Number(clocks?.wtime ?? 0)}
          placeholder={"White"}
        />
      </div>

      <div ref={boardElementRef} className="boardWindow"></div>

      <div className="movesWindow">
        <h4>Move List</h4>

        {cccGame ? (
          <MoveList game={game.current} />
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
            liveInfosBlack={liveInfosBlack}
            liveInfosWhite={liveInfosWhite}
            liveInfosStockfish={liveInfosStockfish}
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
