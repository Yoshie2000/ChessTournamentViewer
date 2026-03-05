import { useLiveInfo } from "../context/LiveInfoContext";
import {
  type EngineColor,
} from "../LiveInfo";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "./Loading";

type EngineCardProps = {
  color: EngineColor;
  time: number;
  className?: string;
};

export function EngineMinimal({
  color,
  time,
  className,
}: EngineCardProps) {
  const { engineInfo: engine, liveInfo: info } = useLiveInfo((state) => state.liveInfos[color]);

  const data = info?.info;
  const loading = !data || !engine || !info || !time;

  return (
    <div
      className={`engineMinimal ${loading ? "loading" : ""} ${className ?? ""}`}
    >
      <div className="engineInfoHeader">
        {loading ? (
          <SkeletonBlock width={36} height={36} style={{ margin: 6 }} />
        ) : (
          <EngineLogo engine={engine!} />
        )}

        <div className="engineName">
          {loading ? color : engine!.name}
        </div>

        <div className="engineOutput">
          <div className="engineTime">
            {loading ? <SkeletonText width="80px" /> : formatTime(time)}
          </div>
          <div> {loading ? <SkeletonText width="40px" /> : data.score}</div>
        </div>
      </div>
    </div>
  );
}
