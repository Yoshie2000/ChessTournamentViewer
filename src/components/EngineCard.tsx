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

function formatLargeNumber(value: string) {
  const x = Number(value);
  if (x >= 1_000_000_000)
    return (
      String(Math.floor((100 * x) / 1_000_000_000) / 100).padEnd(2, "0") + "B"
    );
  if (x >= 1_000_000)
    return String(Math.floor((100 * x) / 1_000_000) / 100).padEnd(2, "0") + "M";
  if (x >= 1_000)
    return String(Math.floor((100 * x) / 1_000) / 100).padEnd(2, "0") + "K";
  return String(value);
}

function formatTime(time: number) {
  if (time < 0) time = 0;

  const hundreds = String(Math.floor(time / 10) % 100).padStart(2, "0");
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
    <div className={`engineComponent ${loading ? "loading" : ""}`}>
      <div className="engineInfoHeader">
        {loading ? (
          <SkeletonBlock className="engineLogo" />
        ) : (
          <EngineLogo engine={engine!} />
        )}

        <div className="engineName">
          {loading ? (placeholder ?? "Loading…") : engine!.name}
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
