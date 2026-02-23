import { useMemo, useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { EngineCard } from "./EngineCard";
import { EngineVsEngine } from "./EngineVsEngine";
import "./EngineWindow.css";
import type { LiveEngineDataEntry } from "../LiveInfo";

type EngineWindowProps = {
  liveInfos: LiveEngineDataEntry;
  clocks?: { wtime?: string; btime?: string };
  fen: string
};

export function EngineWindow({liveInfos, clocks, fen}: EngineWindowProps) {
  const isMobile = useMediaQuery({ maxWidth: 1400 });
  const [activeTab, setActiveTab] = useState<"engines" | "kibitzer">("engines");

  const [wtime, btime, ktimes] = useMemo(() => {
    const wtime = Number(clocks?.wtime ?? 0);
    const btime = Number(clocks?.btime ?? 0);
    const ktimes = {
      red: Number(liveInfos.red.liveInfo?.info?.time ?? 1) || 1,
      green: Number(liveInfos.green.liveInfo?.info?.time ?? 1) || 1,
      blue: Number(liveInfos.blue.liveInfo?.info?.time ?? 1) || 1,
    }
    return [wtime, btime, ktimes];
  }, [clocks?.wtime, clocks?.btime, liveInfos.red.liveInfo?.info.time, liveInfos.green.liveInfo?.info.time, liveInfos.blue.liveInfo?.info.time]);

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
          <EngineCard
            engine={liveInfos.green.engineInfo}
            info={liveInfos.green.liveInfo}
            time={ktimes["green"]}
            placeholder="Kibitzer"
            fen={fen}
          />
        )}
      </div>
    );
  }

  const activeKibitzers = (["green", "blue", "red"] as const).filter((color) => !!liveInfos[color].liveInfo);

  useEffect(() => {
    document.documentElement.style.setProperty("--num-engine-cards", String(2 + activeKibitzers.length));
  }, [activeKibitzers.length])

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
      {activeKibitzers.map((color) => (
        <EngineCard
          engine={liveInfos[color].engineInfo}
          info={liveInfos[color].liveInfo}
          time={ktimes[color]}
          placeholder="Kibitzer"
          fen={fen}
          key={color}
        />
      ))}
    </div>
  );
}
