import type { CCCEngine, CCCLiveInfo } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./EngineCard.css";
import { SkeletonBlock, SkeletonText } from "./Loading";

type EngineCardProps = {
  info?: CCCLiveInfo;
  engine?: CCCEngine;
  time: number;
  placeholder?: string;
};

export function formatLargeNumber(value?: string) {
  if (!value) return "-";
  const x = Number(value);
  if (x >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (x >= 1_000) return (x / 1_000).toFixed(2) + "K";
  return String(x);
}

export function formatTime(time: number) {
  if (time < 0) time = 0;

  const hundreds = String(Math.floor(time / 100) % 10).padEnd(2, "0");
  const seconds = String(Math.floor(time / 1000) % 60).padStart(2, "0");
  const minutes = String(Math.floor(time / (1000 * 60)) % 60).padStart(2, "0");
  return `${minutes}:${seconds}.${hundreds}`;
}

export function EngineCard({
  engine,
  info,
  time,
  placeholder,
}: EngineCardProps) {
  const data = info?.info;
  const loading = !data || !engine || !info || !time;

  const fields = loading
    ? ["Depth", "Nodes", "NPS", "Time", "TB Hits", "Hashfull"].map((label) => [
        label,
        null,
      ])
    : [
        ["Depth", `${data.depth} / ${data.seldepth ?? "-"}`],
        ["Nodes", formatLargeNumber(data.nodes)],
        ["NPS", formatLargeNumber(data.speed)],
        ["Time", formatTime(time)],
        ["TB Hits", data.tbhits ?? "-"],
        ["Hashfull", data.hashfull ?? "-"],
      ];

  return (
    <div className={`engineComponent ${!engine ? "loading" : ""}`}>
      <div className="engineInfoHeader">
        {!engine ? (
          <SkeletonBlock width={36} height={36} style={{margin: 6}} />
        ) : (
          <EngineLogo engine={engine!} />
        )}

        <div className="engineName">
          {!engine ? (placeholder ?? "Loading…") : engine!.name}
        </div>

        <div className="engineEval">
          {loading ? <SkeletonText width="40px" /> : data.score}
        </div>
      </div>

      <hr />

      <div className="engineInfoTable">
        {fields.map(([label, value]) => (
          <div className="engineField" key={label}>
            {loading ? (
              <SkeletonText width="100%" />
            ) : (
              <>
                <div className="key">{label}</div>
                <div className="value">{value}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <hr className="enginePvDivider" />

      <div className="enginePvWrapper">
        {loading ? (
          <SkeletonText width="100%" />
        ) : (
          <div className="enginePv">
            PV:
            {data.pv.split(" ").map((move, i) => (
              <span className="pvMove" key={i}>
                {move}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
