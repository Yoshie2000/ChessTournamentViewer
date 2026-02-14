import type { CCCEngine, CCCLiveInfo } from "../types";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "./Loading";

type EngineCardProps = {
  info?: CCCLiveInfo;
  engine?: CCCEngine;
  time: number;
  placeholder?: string;
  className?: string;
};

export function EngineMinimal({
  engine,
  info,
  time,
  placeholder,
  className,
}: EngineCardProps) {
  const data = info?.info;
  const loading = !data || !engine || !info || !time;

  return (
    <div
      className={`engineMinimal ${loading ? "loading" : ""} ${className ?? ""}`}
    >
      <div className="engineInfoHeader">
        {loading ? (
          <SkeletonBlock width={36} height={36} style={{margin: 6}} />
        ) : (
          <EngineLogo engine={engine!} />
        )}

        <div className="engineName">
          {loading ? (placeholder ?? "Loading…") : engine!.name}
        </div>

        <div className="engineOutput">
          <div className="engineTime">{loading ? "" : formatTime(time)}</div>
          <div> {loading ? <SkeletonText width="40px" /> : data.score}</div>
        </div>
      </div>
    </div>
  );
}
