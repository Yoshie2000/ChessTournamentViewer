import { useEffect, useRef, useState } from "react";
import { EngineWorker } from "../engine/EngineWorker";
import { NativeWorker } from "../engine/NativeWorker";
import { StockfishWorker } from "../engine/StockfishWorker";
import { useLiveInfo } from "../context/LiveInfoContext";
import { useEventStore } from "../context/EventContext";
import { useSettings } from "../context/KibitzerSettings";
import { saveLiveInfos } from "../LocalStorage";

export const useKibitzer = ({
  updateBoard,
}: {
  updateBoard: (bypassRateLimit?: boolean) => void;
}) => {
  const kibitzer = useRef<EngineWorker[]>(null);
  const { enableKibitzer, hash, threads } = useSettings(
    (state) => state.kibitzerSettings
  );

  const game = useLiveInfo((state) => state.game);
  const chess960 = useEventStore((state) => state.chess960);

  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeGame = useEventStore((state) => state.activeGame);

  const setLiveEngineData = useLiveInfo((state) => state.setLiveEngineData);
  const updateLiveEngineData = useLiveInfo(
    (state) => state.updateLiveEngineData
  );

  const [activeKibitzer, setActiveKibitzer] = useState<EngineWorker>();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveKibitzer(
        kibitzer.current?.find((kibitzer) => kibitzer.isReady())
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (enableKibitzer) {
      kibitzer.current = [
        new EngineWorker(new NativeWorker(hash, threads, chess960)),
        new EngineWorker(new StockfishWorker(hash, threads, chess960)),
      ];
    } else {
      kibitzer.current = [];
    }
    return () => kibitzer.current?.forEach((worker) => worker.terminate());
  }, [enableKibitzer, hash, threads, chess960]);

  useEffect(() => {
    if (!kibitzer.current || !activeKibitzer) return;

    Promise.all(kibitzer.current.map((kibitzer) => kibitzer.stop())).then(
      () => {
        activeKibitzer.onMessage = (result) => {
          if (game.getHeaders()["Event"] === "?") return;
          if (game.fen() != result.fen) return;

          result.liveInfo.info.ply = result.gameIndex;
          updateLiveEngineData("green", result.liveInfo);
          setLiveEngineData("green", {
            engineInfo: activeKibitzer.getEngineInfo(),
          });

          updateBoard();

          if (activeEvent && activeGame) {
            saveLiveInfos(
              activeEvent,
              activeGame,
              useLiveInfo.getState().liveEngineData["green"].liveInfo
            );
          }
        };
      }
    );
  }, [
    activeKibitzer,
    activeEvent,
    activeEvent?.tournamentDetails.tNr,
    activeGame,
    activeGame?.gameDetails.gameNr,
    updateLiveEngineData,
    updateBoard,
    game,
    setLiveEngineData,
  ]);

  const _kibitzerId = activeKibitzer?.getID();

  useEffect(() => {
    if (!activeGame?.gameDetails.live || !enableKibitzer) return;

    activeKibitzer?.analyze({
      fen: useLiveInfo.getState().currentFen,
      gameIndex: game.length(),
    });

    const unsubscribe = useLiveInfo.subscribe(
      (state) => state.currentFen,
      (currentFen) => {
        activeKibitzer?.analyze({ fen: currentFen, gameIndex: game.length() });
      }
    );

    return unsubscribe;
  }, [
    _kibitzerId,
    activeGame?.gameDetails.gameNr,
    enableKibitzer,
    activeGame?.gameDetails.live,
    activeKibitzer,
    game,
  ]);
};
