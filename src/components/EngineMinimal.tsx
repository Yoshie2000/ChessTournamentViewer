import type { CCCEngine, CCCLiveInfo } from "../types";
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

function formatTime(time: number) {
  if (time < 0) time = 0;

  const hundreds = String(Math.floor(time / 10) % 100).padStart(2, "0");
  const seconds = String(Math.floor(time / 1000) % 60).padStart(2, "0");
  const minutes = String(Math.floor(time / (1000 * 60)) % 60).padStart(2, "0");
  return `${minutes}:${seconds}.${hundreds}`;
}

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
          <SkeletonBlock className="engineLogo" />
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
