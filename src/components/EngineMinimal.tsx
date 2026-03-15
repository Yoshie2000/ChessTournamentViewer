import { memo } from "react";
import { useLiveInfo } from "../context/LiveInfoContext";
import { type EngineColor } from "../LiveInfo";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "./Loading";

type EngineCardProps = { color: EngineColor; className?: string };

const EngineMinimal = memo(({ color, className }: EngineCardProps) => {
  const { engineInfo: engine, liveInfo: info } = useLiveInfo(
    (state) => state.liveInfos[color]
  );
  const time =
    Number(
      useLiveInfo((state) =>
        color === "white" ? state.clocks.wtime : state.clocks.btime
      ) || 1
    ) || 1;

  const data = info?.info;
  const loading = !data || !engine || !info || !time;

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
          <div> {loading ? <SkeletonText width="40px" /> : data.score}</div>
        </div>
      </div>
    </div>
  );
});

export { EngineMinimal };
