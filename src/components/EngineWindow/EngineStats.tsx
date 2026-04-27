import { useState } from "react";
import type { EngineColor, LiveEngineDataEntry } from "../../LiveInfo";
import type { CCCLiveInfo } from "../../types";
import { formatLargeNumber } from "./EngineCard";
import "./EngineStats.css";
import { useInterval } from "../../hooks/useInterval";
import { shallow } from "zustand/shallow";
import { SkeletonText } from "../Loading";

type EngineStatsProps = { colors: readonly (keyof LiveEngineDataEntry)[] };

type SingleStatProps = {
  color: keyof LiveEngineDataEntry;
  property: keyof CCCLiveInfo["info"];
  transform: (value: any) => any;
  loading: boolean;
};

function SingleStat({ color, property, transform, loading }: SingleStatProps) {
  const [stat, setStat] = useState();

  useInterval((state) => {
    setStat(transform(state.liveInfos[color].liveInfo?.info[property]));
  });

  if (loading)
    return <SkeletonText width="60px" style={{ display: "inline-block" }} />;

  return stat;
}

const identity = (value: any) => value;

export function EngineStats({ colors }: EngineStatsProps) {
  const [loadingByColor, setLoadingByColor] = useState(
    colors.reduce(
      (prev, color) => ({ ...prev, [color]: true }),
      {} as Record<EngineColor, boolean>
    )
  );

  useInterval((state) => {
    const loadingByColor = colors.reduce(
      (prev, color) => {
        const data = state.liveInfos[color].liveInfo?.info;
        return { ...prev, [color]: !data };
      },
      {} as Record<EngineColor, boolean>
    );

    setLoadingByColor((previous) => {
      if (shallow(loadingByColor, previous)) return previous;
      return loadingByColor;
    });
  });

  return (
    <tbody className="engineStats">
      <tr className="borderTop">
        <td className="engineFieldKey">Depth</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {loadingByColor[color] ? (
              <SkeletonText width="60px" style={{ display: "inline-block" }} />
            ) : (
              <>
                <SingleStat
                  color={color}
                  property="depth"
                  transform={identity}
                  loading={loadingByColor[color]}
                />
                {" / "}
                <SingleStat
                  color={color}
                  property="seldepth"
                  transform={identity}
                  loading={loadingByColor[color]}
                />
              </>
            )}
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
              loading={loadingByColor[color]}
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
              loading={loadingByColor[color]}
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
              loading={loadingByColor[color]}
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
              loading={loadingByColor[color]}
            />
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey"></td>
        {colors.map((color) => (
          <td key={color} className="engineEvaluation">
            <SingleStat
              color={color}
              property="score"
              transform={identity}
              loading={loadingByColor[color]}
            />
          </td>
        ))}
      </tr>
    </tbody>
  );
}
