import { useEffect, useRef } from "react";
import { EngineWorker } from "../engine/EngineWorker";
import { NativeWorker } from "../engine/NativeWorker";
import { StockfishWorker } from "../engine/StockfishWorker";
import { useLiveInfo } from "../context/LiveInfoContext";
import { useEventStore } from "../context/EventContext";
import { useKibitzerSettings } from "../context/KibitzerSettings";
import { saveLiveInfos } from "../LocalStorage";

export const useKibitzer = ({
  updateBoard,
}: {
  updateBoard: (bypassRateLimit?: boolean) => void;
}) => {
  const kibitzer = useRef<EngineWorker[]>(null);
  const kibitzerSettings = useKibitzerSettings(
    (state) => state.kibitzerSettings
  );

  const game = useLiveInfo((state) => state.game);

  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  const setLiveEngineData = useLiveInfo((state) => state.setLiveEngineData);
  const updateLiveEngineData = useLiveInfo(
    (state) => state.updateLiveEngineData
  );

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

          result.liveInfo.info.ply = result.gameIndex;
          updateLiveEngineData("green", result.liveInfo);
          setLiveEngineData("green", {
            engineInfo: activeKibitzer.getEngineInfo(),
          });

          updateBoard();

          if (cccEvent && cccGame) {
            saveLiveInfos(
              cccEvent,
              cccGame,
              useLiveInfo.getState().liveEngineData["green"].liveInfo
            );
          }
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
    game,
    setLiveEngineData,
  ]);

  const _kibitzerId = activeKibitzer?.getID();

  useEffect(() => {
    if (!cccGame?.gameDetails.live || !kibitzerSettings.enableKibitzer) return;

    const unsubscribe = useLiveInfo.subscribe(
      (state) => state.currentFen,
      (currentFen) => {
        activeKibitzer?.analyze({ fen: currentFen, gameIndex: game.length() });
      }
    );

    return unsubscribe;
  }, [
    _kibitzerId,
    cccGame?.gameDetails.gameNr,
    kibitzerSettings.enableKibitzer,
    cccGame?.gameDetails.live,
    activeKibitzer,
    game,
  ]);
};
