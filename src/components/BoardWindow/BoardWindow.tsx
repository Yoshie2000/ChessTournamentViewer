import { memo, useCallback, useEffect, useRef } from "react";
import { useLiveBoard } from "../../hooks/BoardHook";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { TCECWebSocket } from "../../TCECWebsocket";
import { CCCWebSocket } from "../../CCCWebsocket";
import type { CCCLiveInfo, CCCMessage } from "../../types";
import {
  EmptyEngineDefinition,
  extractLiveInfoFromGame,
  getTimeControl,
  type EngineColor,
} from "../../LiveInfo";
import { loadLiveInfos } from "../../LocalStorage";
import { type Square } from "../../chess.js/chess";
import { uciToSan } from "../../utils";
import { EngineMinimal } from "../EngineWindow/EngineMinimal";
import { GameResultOverlay } from "./GameResultOverlay";
import { useKibitzer } from "../../hooks/useKibitzer";
import { LiveMoveList } from "./LiveMoveList";
import { useMediaQuery } from "react-responsive";
import {
  useGameHistory,
  type TranspositionDataEntry,
} from "@/context/GameHistoryContext";

const wsByProvider = {
  ccc: new CCCWebSocket(),
  tcec: new TCECWebSocket(),
} as const;

const searchParams = new URL(location.href).searchParams;

const _initialProvider =
  searchParams.get("provider") === "tcec" ? "tcec" : "ccc";
const _initialEvent = searchParams.get("event");
const _initialGame = searchParams.get("game");

export const BoardWindow = memo(() => {
  const activeWSRef = useRef(wsByProvider[_initialProvider]);

  const { Board, updateBoard } = useLiveBoard({
    animated: true,
    id: "main-board",
  });

  useKibitzer({ updateBoard });

  const activeProvider = useEventStore((state) => state.activeProvider);
  const activeEvent = useEventStore((state) => state.activeEvent);
  const game = useLiveInfo((state) => state.game);

  const initialEvent = useRef<string | null>(_initialEvent);
  const initialGame = useRef<string | null>(_initialGame);

  const history = useGameHistory((state) => state.history);
  const setOverlappingMovesIndxList = useGameHistory(
    (state) => state.setTranspositions
  );
  // game number as index from schedule + 1
  const currentSelectedGameNumber = useEventStore(
    (state) => state.selectedGameNumber
  );

  const handleLiveInfo = useCallback(
    (msg: CCCLiveInfo) => {
      if (activeWSRef.current instanceof CCCWebSocket) {
        msg.info.pvSan = uciToSan(game.fen(), msg.info.pv.split(" ")).join(" ");
      }

      const color = msg.info.color as EngineColor;
      const liveInfoState = useLiveInfo.getState();

      const { tcBase, tcIncrement } = getTimeControl(liveInfoState.game);
      const liveInfos = liveInfoState.liveEngineData[color].liveInfo;
      const previousTimeLeft =
        liveInfos[msg.info.ply - 2]?.info.timeLeft ?? tcBase;
      msg.info.timeLeft =
        previousTimeLeft + tcIncrement - Number(msg.info.time);

      liveInfoState.updateLiveEngineData(color, msg);
    },
    [game]
  );

  useEffect(() => {
    if (!currentSelectedGameNumber) {
      return;
    }

    useGameHistory
      .getState()
      .setDataForGame(currentSelectedGameNumber, game.boardFenHistory());
  }, [currentSelectedGameNumber, game]);

  useEffect(() => {
    if (!currentSelectedGameNumber) {
      return;
    }

    const reverseGameNumber =
      currentSelectedGameNumber % 2 === 0
        ? currentSelectedGameNumber - 1
        : currentSelectedGameNumber + 1;

    const currentFenList = history[currentSelectedGameNumber]?.fenList;
    const reverseGameFenList = history[reverseGameNumber]?.fenList;
    const reverseGameMoveList = history[reverseGameNumber]?.moveList;

    if (!currentFenList || !reverseGameFenList || !reverseGameMoveList) {
      return;
    }

    const fenSet = new Set<string>(reverseGameFenList);
    const samePositionsList: TranspositionDataEntry[] = [];

    let wasSamePosition = false;
    currentFenList.forEach((fen, i, array) => {
      if (fenSet.has(fen)) {
        samePositionsList.push({ moveNumber: i });

        wasSamePosition = true;
      } else if (wasSamePosition) {
        const prevFen = array[i - 1];
        const divergeMoveIndex = reverseGameFenList.findLastIndex(
          (val) => prevFen === val
        );
        const move = reverseGameMoveList[divergeMoveIndex];

        wasSamePosition = false;

        samePositionsList.push({ moveNumber: i, diverge: move });
      }
    });

    setOverlappingMovesIndxList(currentSelectedGameNumber, samePositionsList);
  }, [currentSelectedGameNumber, history, setOverlappingMovesIndxList]);

  const handleMessage = useCallback(
    function (msg: CCCMessage) {
      const liveInfoState = useLiveInfo.getState();
      const eventState = useEventStore.getState();
      const currentProvider = eventState.activeProvider;

      switch (msg.type) {
        case "eventUpdate":
          eventState.setEvent(currentProvider, msg);
          break;

        case "gameUpdate": {
          game.loadPgn(msg.gameDetails.pgn);
          liveInfoState.setCurrentMoveNumber(() => -1);

          // Reset kibitzer live infos
          const event = eventState.activeEvent;
          liveInfoState.setLiveEngineData("green", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: event ? loadLiveInfos(event, msg) : [],
          });
          liveInfoState.setLiveEngineData("blue", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: [],
          });
          liveInfoState.setLiveEngineData("red", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: [],
          });

          // Load white + black engine live info
          const { liveInfosBlack, liveInfosWhite } =
            extractLiveInfoFromGame(game);
          const engines =
            eventState.activeEvent?.tournamentDetails.engines ?? [];
          const wEngine =
            engines.find(
              (engine) => engine.name === game.getHeaders()["White"]
            ) || EmptyEngineDefinition;

          const bEngine =
            engines.find(
              (engine) => engine.name === game.getHeaders()["Black"]
            ) || EmptyEngineDefinition;

          liveInfoState.setLiveEngineData("white", {
            liveInfo: liveInfosWhite,
            engineInfo: wEngine,
          });
          liveInfoState.setLiveEngineData("black", {
            liveInfo: liveInfosBlack,
            engineInfo: bEngine,
          });

          liveInfoState.setCurrentMoveNumber(() => -1);
          updateBoard();

          eventState.setGame(msg);
          liveInfoState.setCurrentFen(game.fen());
          liveInfoState.setMoves(game.history());
          break;
        }

        case "liveInfo": {
          handleLiveInfo(msg);
          updateBoard();
          break;
        }

        case "eventsListUpdate":
          eventState.setEventList(currentProvider, msg);
          break;

        case "clocks":
          liveInfoState.setClocks((color) =>
            color === "white" ? Number(msg.wtime) : Number(msg.btime)
          );
          break;

        case "newMove": {
          const from = msg.move.slice(0, 2) as Square;
          const to = msg.move.slice(2, 4) as Square;
          const promo = msg.move?.[4];

          game.move({ from, to, promotion: promo });
          liveInfoState.setCurrentFen(game.fen());
          liveInfoState.setMoves(game.history());
          updateBoard(true);

          if (currentSelectedGameNumber) {
            useGameHistory
              .getState()
              .setDataForGame(
                currentSelectedGameNumber,
                game.boardFenHistory()
              );
          }

          break;
        }

        case "kibitzer":
          liveInfoState.setLiveEngineData(msg.color as EngineColor, {
            engineInfo: msg.engine,
          });
          updateBoard(true);
          break;

        case "result": {
          if (currentSelectedGameNumber) {
            useGameHistory
              .getState()
              .setDataForGame(
                currentSelectedGameNumber,
                game.boardFenHistory()
              );
          }

          game.setHeader("Termination", msg.reason);
          game.setHeader("Result", msg.score);
          updateBoard(true);
          break;
        }
      }
    },
    [game, handleLiveInfo, updateBoard, currentSelectedGameNumber]
  );

  useEffect(() => {
    const newWS = wsByProvider[activeProvider];
    const { pendingEventId } = useEventStore.getState();

    if (activeWSRef.current !== newWS) {
      activeWSRef.current.disconnect();
      activeWSRef.current = newWS;
    }

    if (!newWS.isConnected()) {
      newWS.connect(
        handleMessage,
        initialEvent.current ?? pendingEventId ?? undefined,
        initialGame.current ?? undefined
      );
      initialEvent.current = null;
      initialGame.current = null;
    } else {
      newWS.setHandler(handleMessage);
    }

    const requestEvent = (gameNr?: string, eventNr?: string) => {
      const message: Record<string, string> = { type: "requestEvent" };
      if (gameNr) message["gameNr"] = gameNr;
      if (eventNr) message["eventNr"] = eventNr;
      newWS.send(message);
    };

    useEventStore.getState().setRequestEvent(requestEvent);
  }, [activeProvider, handleMessage]);

  useEffect(() => {
    const passiveProvider = _initialProvider === "ccc" ? "tcec" : "ccc";
    const passiveWS = wsByProvider[passiveProvider];
    const eventState = useEventStore.getState();

    if (!eventState.providerData[passiveProvider]?.eventList) {
      passiveWS.fetchEventList((msg) => {
        useEventStore.getState().setEventList(passiveProvider, msg);
      });
    }
  }, []);

  useEffect(() => {
    return useLiveInfo.subscribe(
      (state) => state.currentMoveNumber,
      () => updateBoard(true)
    );
  }, []);

  useEffect(() => {
    const eventState = useEventStore.getState();
    const eventList = eventState.providerData[activeProvider]?.eventList;
    if (!activeEvent || !eventList || eventState.pendingEventId) return;

    const eventExists = eventList.events.some(
      (event) => String(event.id) === activeEvent.tournamentDetails.tNr
    );
    if (!eventExists) {
      eventState.requestEvent(undefined, eventList.events[0]?.id);
    }
  }, [activeEvent, activeProvider]);

  const isMobile = useMediaQuery({ maxWidth: 775 });

  return (
    <div className="boardWindow">
      {isMobile && <EngineMinimal color="black" className="borderRadiusTop" />}
      <div className="boardWrapper">
        {Board}

        <GameResultOverlay />
      </div>

      <LiveMoveList />
      {isMobile && (
        <EngineMinimal color="white" className="borderRadiusBottom" />
      )}
    </div>
  );
});
