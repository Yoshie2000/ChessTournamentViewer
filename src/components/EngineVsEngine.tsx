import type { CCCEngine, CCCLiveInfo } from "../types";
import { formatLargeNumber, formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineVsEngine.css";
import { SkeletonBlock } from "./Loading";

type Props = {
  white?: CCCEngine;
  black?: CCCEngine;
  whiteInfo?: CCCLiveInfo;
  blackInfo?: CCCLiveInfo;
  wtime: number;
  btime: number;
};

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

  return (
    <div className="engineVsEngine">
      <div className="engineVsEngineHeader">
        <div className="engineWhite">
          <div className="engineName">{white?.name ?? "White"}</div>
          {white ? (
            <EngineLogo engine={white} />
          ) : (
            <SkeletonBlock
              className="engineLogo"
              width={36}
              height={36}
              style={{ margin: 6 }}
            />
          )}
        </div>
        <div className="engineLabel"></div>
        <div className="engineBlack">
          <div className="engineName">{black?.name ?? "Black"}</div>
          {black ? (
            <EngineLogo engine={black} />
          ) : (
            <SkeletonBlock
              className="engineLogo"
              width={36}
              height={36}
              style={{ margin: 6 }}
            />
          )}
        </div>
      </div>

      <hr/>

      <div className="engineVsEngineBody">
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
          <div className="value">
            {w?.tbhits ? formatLargeNumber(w.tbhits) : "-"}
          </div>
        </div>
        <div className="engineLabel">TB Hits</div>
        <div className="engineField">
          <div className="value">
            {b?.tbhits ? formatLargeNumber(b.tbhits) : "-"}
          </div>
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

      <hr/>

      <div className="engineVsEngineEval">
        <div className="engineField">
          <div className="engineEval value">{w?.score ?? "-"}</div>
        </div>
        <div className="engineLabel"></div>
        <div className="engineField">
          <div className="engineEval value">{b?.score ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}
