import { memo, useCallback, useEffect, useRef } from "react";
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
import { type Square } from "../../chess.js/chess";
import { uciToSan } from "../../utils";
import { EngineMinimal } from "../EngineMinimal";
import { GameResultOverlay } from "../GameResultOverlay";
import { useKibitzer } from "../../hooks/useKibitzer";
import { LiveMoveList } from "../LiveMoveList";
import { useMediaQuery } from "react-responsive";

const isTCEC = window.location.search.includes("tcec");
const _initialWS = isTCEC ? new TCECWebSocket() : new CCCWebSocket();

export const BoardWindow = memo(() => {
  const ws = useRef<TournamentWebSocket>(_initialWS);

  const { Board, updateBoard } = useLiveBoard({
    animated: true,
    id: "main-board",
  });

  useKibitzer({ updateBoard });

  const cccEvent = useEventStore((state) => state.cccEvent);
  const game = useLiveInfo((state) => state.game);

  const handleLiveInfo = useCallback(
    (msg: CCCLiveInfo) => {
      if (ws.current instanceof CCCWebSocket) {
        msg.info.pvSan = uciToSan(game.fen(), msg.info.pv.split(" ")).join(" ");
      }

      const color = msg.info.color as EngineColor;
      useLiveInfo.getState().updateLiveEngineData(color, msg);
    },
    [game]
  );

  const handleMessage = useCallback(
    function (msg: CCCMessage) {
      const liveInfoState = useLiveInfo.getState();
      const eventState = useEventStore.getState();

      switch (msg.type) {
        case "eventUpdate":
          eventState.setEvent(msg);
          break;

        case "gameUpdate": {
          game.loadPgn(msg.gameDetails.pgn);
          liveInfoState.setCurrentMoveNumber(() => -1);

          // Reset kibitzer live infos
          liveInfoState.setLiveEngineData("green", {
            engineInfo: EmptyEngineDefinition,
            liveInfo: cccEvent ? loadLiveInfos(cccEvent, msg) : [],
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
          const engines = eventState.cccEvent?.tournamentDetails.engines ?? [];
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
          eventState.setEventList(msg);
          break;

        case "clocks":
          liveInfoState.setClocks(() => msg);
          break;

        case "newMove": {
          const from = msg.move.slice(0, 2) as Square;
          const to = msg.move.slice(2, 4) as Square;
          const promo = msg.move?.[4];

          game.move({ from, to, promotion: promo });
          liveInfoState.setCurrentFen(game.fen());
          liveInfoState.setMoves(game.history());
          updateBoard(true);

          break;
        }

        case "kibitzer":
          liveInfoState.setLiveEngineData(msg.color as EngineColor, {
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
    [cccEvent, game, handleLiveInfo, updateBoard]
  );

  useEffect(() => {
    if (!ws.current.isConnected()) {
      ws.current.connect(handleMessage);
    } else {
      ws.current.setHandler(handleMessage);
    }
  }, [handleMessage]);

  useEffect(() => {
    useLiveInfo.subscribe(
      (state) => state.currentMoveNumber,
      () => updateBoard(true)
    );
  }, []);

  useEffect(() => {
    const requestEvent = (gameNr?: string, eventNr?: string) => {
      const message: Record<string, string> = { type: "requestEvent" };
      if (gameNr) message["gameNr"] = gameNr;
      if (eventNr) message["eventNr"] = eventNr;

      ws.current.send(message);
    };

    useEventStore.getState().setRequestEvent(requestEvent);
  }, []);

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
