import { useState } from "react";
import type { LiveEngineDataEntry } from "../../LiveInfo";
import type { CCCLiveInfo } from "../../types";
import { formatLargeNumber } from "./EngineCard";
import "./EngineStats.css";
import { useInterval } from "../../hooks/useInterval";

type EngineStatsProps = { colors: readonly (keyof LiveEngineDataEntry)[] };

type SingleStatProps = {
  color: keyof LiveEngineDataEntry;
  property: keyof CCCLiveInfo["info"];
  transform: (value: any) => any;
};

function SingleStat({ color, property, transform }: SingleStatProps) {
  const [stat, setStat] = useState();

  useInterval((state) => {
    setStat(transform(state.liveInfos[color].liveInfo?.info[property]));
  });

  return stat;
}

const identity = (value: any) => value;

export function EngineStats({ colors }: EngineStatsProps) {
  return (
    <tbody className="engineStats">
      <tr className="borderTop">
        <td className="engineFieldKey">Depth</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            <SingleStat color={color} property="depth" transform={identity} />
            {" / "}
            <SingleStat
              color={color}
              property="seldepth"
              transform={identity}
            />
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">Nodes</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            <SingleStat
              color={color}
              property="nodes"
              transform={formatLargeNumber}
            />
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">NPS</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            <SingleStat
              color={color}
              property="speed"
              transform={formatLargeNumber}
            />
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">TB Hits</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            <SingleStat
              color={color}
              property="tbhits"
              transform={formatLargeNumber}
            />
          </td>
        ))}
      </tr>

      <tr className="borderBottom">
        <td className="engineFieldKey">Hashfull</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            <SingleStat
              color={color}
              property="hashfull"
              transform={identity}
            />
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey"></td>
        {colors.map((color) => (
          <td key={color} className="engineEvaluation">
            <SingleStat color={color} property="score" transform={identity} />
          </td>
        ))}
      </tr>
    </tbody>
  );
}
