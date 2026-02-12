import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import type { EngineWindowProps } from "../types";
import { EngineCard } from "./EngineCard";
import { EngineVsEngine } from "./EngineVsEngine";

export function EngineWindow(props: EngineWindowProps) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [activeTab, setActiveTab] = useState<"engines" | "kibitzer">("engines");

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
            white={props.white}
            black={props.black}
            whiteInfo={props.latestLiveInfoWhite}
            blackInfo={props.latestLiveInfoBlack}
            wtime={Number(props.clocks?.wtime ?? 0)}
            btime={Number(props.clocks?.btime ?? 0)}
          />
        ) : (
          <EngineCard
            engine={props.activeKibitzerInfo}
            info={props.latestLiveInfoKibitzer}
            time={Number(props.latestLiveInfoKibitzer?.info?.time ?? 0)}
            placeholder="Kibitzer"
          />
        )}
      </div>
    );
  }

  return (
    <div className="engineWindow">
      <EngineCard
        engine={props.black}
        info={props.latestLiveInfoBlack}
        time={Number(props.clocks?.btime ?? 0)}
        placeholder="Black"
      />
      <EngineCard
        engine={props.activeKibitzerInfo}
        info={props.latestLiveInfoKibitzer}
        time={Number(props.latestLiveInfoKibitzer?.info?.time ?? 0)}
        placeholder="Kibitzer"
      />
      <EngineCard
        engine={props.white}
        info={props.latestLiveInfoWhite}
        time={Number(props.clocks?.wtime ?? 0)}
        placeholder="White"
      />
    </div>
  );
}
