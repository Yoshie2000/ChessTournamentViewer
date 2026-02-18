import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import type { EngineWindowProps } from "../types";
import { EngineCard } from "./EngineCard";
import { EngineVsEngine } from "./EngineVsEngine";
import "./EngineWindow.css";

export function EngineWindow(props: EngineWindowProps) {
  const isMobile = useMediaQuery({ maxWidth: 1400 });
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
            fen={props.fen}
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
        opponentInfo={props.latestLiveInfoWhite}
        time={Number(props.clocks?.btime ?? 0)}
        placeholder="Black"
        fen={props.fen}
      />
      <EngineCard
        engine={props.white}
        info={props.latestLiveInfoWhite}
        opponentInfo={props.latestLiveInfoBlack}
        time={Number(props.clocks?.wtime ?? 0)}
        placeholder="White"
        fen={props.fen}
      />
      <EngineCard
        engine={props.activeKibitzerInfo}
        info={props.latestLiveInfoKibitzer}
        time={Number(props.latestLiveInfoKibitzer?.info?.time ?? 0)}
        placeholder="Kibitzer"
        fen={props.fen}
      />
    </div>
  );
}
