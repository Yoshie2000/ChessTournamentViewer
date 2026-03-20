import { memo, useState } from "react";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { type EngineColor } from "../../LiveInfo";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "../Loading";
import { useInterval } from "../../hooks/useInterval";

type EngineCardProps = { color: EngineColor; className?: string };

const EngineMinimal = memo(({ color, className }: EngineCardProps) => {
  const engine = useLiveInfo((state) => state.liveInfos[color].engineInfo);

  const [score, setScore] = useState<string>();
  const [time, setTime] = useState<number>(1);

  useInterval((state) => {
    const wtime = state.liveInfos.white.liveInfo?.info.timeLeft;
    const btime = state.liveInfos.black.liveInfo?.info.timeLeft;
    setTime(
      Number(color === "white" ? wtime : color === "black" ? btime : "1") || 1
    );
    setScore(state.liveInfos[color].liveInfo?.info.score);
  });

  const loading = !score || !engine || !time;

  return (
    <div
      className={`engineMinimal ${loading ? "loading" : ""} ${className ?? ""}`}
    >
      <div className="engineInfoHeader">
        {engine ? (
          <EngineLogo engine={engine} size={32} />
        ) : (
          <SkeletonBlock width={32} height={32} style={{ margin: 6 }} />
        )}

        <div className="engineName">{engine.name ? engine.name : color}</div>

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
