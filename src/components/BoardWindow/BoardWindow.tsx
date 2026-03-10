import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useLiveBoard } from "../../hooks/BoardHook";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { TCECWebSocket } from "../../TCECWebsocket";
import { CCCWebSocket, type TournamentWebSocket } from "../../CCCWebsocket";
import type { CCCLiveInfo, CCCMessage } from "../../types";
import {
  EmptyEngineDefinition,
  extractLiveInfoFromGame,
  type EngineColor,
} from "../../LiveInfo";
import { loadLiveInfos } from "../../LocalStorage";
import { Chess, type Square } from "../../chess.js/chess";
import { uciToSan } from "../../utils";
import { EngineMinimal } from "../EngineMinimal";
import { GameResultOverlay } from "../GameResultOverlay";
import { MoveList } from "../MoveList";
import { useKibitzer } from "../../hooks/useKibitzer";

const isTCEC = window.location.search.includes("tcec");
const _initialWS = isTCEC ? new TCECWebSocket() : new CCCWebSocket();

export const BoardWindow = memo(() => {
  const ws = useRef<TournamentWebSocket>(_initialWS);

  const { Board, game, updateBoard } = useLiveBoard({
    animated: true,
    id: "main-board",
  });

  useKibitzer({ updateBoard });

  const [moves, setMoves] = useState<string[]>([]);

  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  const setEvent = useEventStore((state) => state.setEvent);
  const setGame = useEventStore((state) => state.setGame);
  const setEventList = useEventStore((state) => state.setEventList);
  const setRequestEvent = useEventStore((state) => state.setRequestEvent);

  const currentMoveNumber = useLiveInfo((state) => state.currentMoveNumber);
  const setCurrentMoveNumber = useLiveInfo(
    (state) => state.setCurrentMoveNumber
  );

  const setClocks = useLiveInfo((state) => state.setClocks);
  const setLiveEngineData = useLiveInfo((state) => state.setLiveEngineData);
  const updateLiveEngineData = useLiveInfo(
    (state) => state.updateLiveEngineData
  );

  const setCurrentFen = useLiveInfo((state) => state.setCurrentFen);

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
  }, [cccEvent, game, setLiveEngineData]);

  const handleLiveInfo = useCallback(
    (msg: CCCLiveInfo) => {
      if (ws.current instanceof CCCWebSocket) {
        msg.info.pvSan = uciToSan(game.fen(), msg.info.pv.split(" ")).join(" ");
      }

      const color = msg.info.color as EngineColor;
      updateLiveEngineData(color, msg);
    },
    [game, updateLiveEngineData]
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
      game,
      handleLiveInfo,
      setClocks,
      setCurrentFen,
      setCurrentMoveNumber,
      setEvent,
      setEventList,
      setGame,
      setLiveEngineData,
      updateBoard,
    ]
  );

  useEffect(() => {
    if (!ws.current.isConnected()) {
      ws.current.connect(handleMessage);
    } else {
      ws.current.setHandler(handleMessage);
    }
  }, [handleMessage]);

  useEffect(() => {
    setCurrentFen(game.fenAt(currentMoveNumber));
    updateBoard();
  }, [currentMoveNumber, game, setCurrentFen, updateBoard]);

  useEffect(() => {
    const requestEvent = (gameNr?: string, eventNr?: string) => {
      const message: Record<string, string> = { type: "requestEvent" };
      if (gameNr) message["gameNr"] = gameNr;
      if (eventNr) message["eventNr"] = eventNr;

      ws.current.send(message);
    };

    setRequestEvent(requestEvent);
  }, [setRequestEvent]);

  const pgnHeaders = game.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  return (
    <div className="boardWindow">
      <EngineMinimal color="black" className="borderRadiusTop" />
      <div className="boardWrapper">
        {Board}

        {termination &&
          result &&
          result !== "*" &&
          (currentMoveNumber === -1 || currentMoveNumber === game.length()) && (
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
      <EngineMinimal color="white" className="borderRadiusBottom" />
    </div>
  );
});
