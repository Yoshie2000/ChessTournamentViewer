import { useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { EngineCard } from "./EngineCard";
import { EngineVsEngine } from "./EngineVsEngine";
import "./EngineWindow.css";
import type { LiveEngineDataEntry } from "../LiveInfo";
import { KibitzerCard } from "./KibitzerCard";

type EngineWindowProps = {
  liveInfos: LiveEngineDataEntry;
  clocks?: { wtime?: string; btime?: string };
  fen: string;
};

export function EngineWindow({ liveInfos, clocks, fen }: EngineWindowProps) {
  const isMobile = useMediaQuery({ maxWidth: 1400 });
  const [activeTab, setActiveTab] = useState<"engines" | "kibitzer">("engines");

  const activeKibitzers = (["green", "blue", "red"] as const).filter(
    (color) => !!liveInfos[color].liveInfo
  );

  const [wtime, btime] = useMemo(() => {
    const wtime = Number(clocks?.wtime ?? 0);
    const btime = Number(clocks?.btime ?? 0);
    return [wtime, btime];
  }, [clocks?.wtime, clocks?.btime]);

  const kibitzerCard =
    activeKibitzers.length === 0 ? null : activeKibitzers.length === 1 ? (
      <EngineCard
        engine={liveInfos.green.engineInfo}
        info={liveInfos.green.liveInfo}
        time={1}
        placeholder="Kibitzer"
        fen={fen}
      />
    ) : (
      <KibitzerCard fen={fen} liveInfos={liveInfos} />
    );

  if (isMobile) {
    return (
      <div className="engineWindowMobile">
        <div className="engineTabs">
          <button
            className={activeTab === "engines" ? "active" : ""}
            onClick={() => setActiveTab("engines")}
          >
            Engines
          </button>

          <button
            className={activeTab === "kibitzer" ? "active" : ""}
            onClick={() => setActiveTab("kibitzer")}
          >
            Kibitzer
          </button>
        </div>

        {activeTab === "engines" ? (
          <EngineVsEngine
            white={liveInfos.white.engineInfo}
            black={liveInfos.black.engineInfo}
            whiteInfo={liveInfos.white.liveInfo}
            blackInfo={liveInfos.black.liveInfo}
            wtime={wtime}
            btime={btime}
          />
        ) : (
          kibitzerCard
        )}
      </div>
    );
  }

  return (
    <div className="engineWindow">
      <EngineCard
        engine={liveInfos.black.engineInfo}
        info={liveInfos.black.liveInfo}
        opponentInfo={liveInfos.white.liveInfo}
        time={btime}
        placeholder="Black"
        fen={fen}
      />
      <EngineCard
        engine={liveInfos.white.engineInfo}
        info={liveInfos.white.liveInfo}
        opponentInfo={liveInfos.black.liveInfo}
        time={wtime}
        placeholder="White"
        fen={fen}
      />
      {kibitzerCard}
    </div>
  );
}
