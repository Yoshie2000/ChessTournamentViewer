import { memo, useEffect, useState } from "react";
import { useLiveInfo } from "../context/LiveInfoContext";
import { type EngineColor } from "../LiveInfo";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "./Loading";

type EngineCardProps = { color: EngineColor; className?: string };

const MAX_UPDATE_INTERVAL_MS = 100;

const EngineMinimal = memo(({ color, className }: EngineCardProps) => {
  const engine = useLiveInfo((state) => state.liveInfos[color].engineInfo);

  const [score, setScore] = useState<string>();
  const [time, setTime] = useState<number>(1);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useLiveInfo.getState();
      setScore(state.liveInfos[color].liveInfo?.info.score);
      setTime(
        Number(color === "white" ? state.clocks.wtime : state.clocks.btime) || 1
      );
    }, MAX_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const loading = !score || !engine || !time;

  return (
    <div
      className={`engineMinimal ${loading ? "loading" : ""} ${className ?? ""}`}
    >
      <div className="engineInfoHeader">
        {engine ? (
          <EngineLogo engine={engine} />
        ) : (
          <SkeletonBlock width={36} height={36} style={{ margin: 6 }} />
        )}

        <div className="engineName">{loading ? color : engine!.name}</div>

        <div className="engineOutput">
          <div className="engineTime">
            {loading ? <SkeletonText width="80px" /> : formatTime(time)}
          </div>
          <div> {loading ? <SkeletonText width="40px" /> : score}</div>
        </div>
      </div>
    </div>
  );
});

export { EngineMinimal };
