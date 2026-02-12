import type { CCCEngine, CCCLiveInfo } from "../types";
import { EngineLogo } from "./EngineLogo";
import "./EngineVsEngine.css";

type Props = {
  white?: CCCEngine;
  black?: CCCEngine;
  whiteInfo?: CCCLiveInfo;
  blackInfo?: CCCLiveInfo;
  wtime: number;
  btime: number;
};

function formatTime(time: number) {
  if (time < 0) time = 0;
  const seconds = String(Math.floor(time / 1000) % 60).padStart(2, "0");
  const minutes = String(Math.floor(time / (1000 * 60)) % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function EngineVsEngine({
  white,
  black,
  whiteInfo,
  blackInfo,
  wtime,
  btime,
}: Props) {
  const w = whiteInfo?.info;
  const b = blackInfo?.info;

  const formatLargeNumber = (value?: string | number) => {
    if (value == null) return "-";
    const x = Number(value);
    if (x >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
    if (x >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
    if (x >= 1_000) return (x / 1_000).toFixed(2) + "K";
    return String(x);
  };

  return (
    <div className="engineVsEngine">
      {/* ENGINE NAMES + LOGOS */}
      <div className="engineWhite">
        <div className="engineName">{white?.name ?? "White"}</div>
        {white ? <EngineLogo engine={white} /> : null}
      </div>
      <div className="engineLabel"></div>
      <div className="engineBlack">
        <div className="engineName">{black?.name ?? "Black"}</div>
        {black ? <EngineLogo engine={black} /> : null}
      </div>

      <div className="engineField">
        <div className="engineEval value">{w?.score ?? "-"}</div>
      </div>
      <div className="engineLabel">Evaluation</div>
      <div className="engineField">
        <div className="engineEval value">{b?.score ?? "-"}</div>
      </div>

      <div className="engineField">
        <div className="value">
          {w ? `${w.depth} / ${w.seldepth ?? "-"}` : "-"}
        </div>
      </div>
      <div className="engineLabel">Depth / SD</div>
      <div className="engineField">
        <div className="value">
          {b ? `${b.depth} / ${b.seldepth ?? "-"}` : "-"}
        </div>
      </div>

      <div className="engineField">
        <div className="value">{formatLargeNumber(w?.nodes)}</div>
      </div>
      <div className="engineLabel">Nodes</div>
      <div className="engineField">
        <div className="value">{formatLargeNumber(b?.nodes)}</div>
      </div>

      <div className="engineField">
        <div className="value">{formatLargeNumber(w?.speed)}</div>
      </div>
      <div className="engineLabel">NPS</div>
      <div className="engineField">
        <div className="value">{formatLargeNumber(b?.speed)}</div>
      </div>

      <div className="engineField">
        <div className="value">{w?.tbhits ?? "-"}</div>
      </div>
      <div className="engineLabel">TB Hits</div>
      <div className="engineField">
        <div className="value">{b?.tbhits ?? "-"}</div>
      </div>

      <div className="engineField">
        <div className="value">{w?.hashfull ?? "-"}</div>
      </div>
      <div className="engineLabel">Hashfull</div>
      <div className="engineField">
        <div className="value">{b?.hashfull ?? "-"}</div>
      </div>

      <div className="engineField">
        <div className="value">{formatTime(wtime)}</div>
      </div>
      <div className="engineLabel">Time</div>
      <div className="engineField">
        <div className="value">{formatTime(btime)}</div>
      </div>
    </div>
  );
}
