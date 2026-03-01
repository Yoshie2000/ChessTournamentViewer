import type { LiveEngineDataEntry } from "../LiveInfo";
import { formatLargeNumber } from "./EngineCard";
import "./EngineStats.css";

type EngineStatsProps = {
  colors: readonly (keyof LiveEngineDataEntry)[];
  liveInfos: LiveEngineDataEntry;
};

export function EngineStats({ colors, liveInfos }: EngineStatsProps) {
  return (
    <tbody className="engineStats">
      <tr className="borderTop">
        <td className="engineFieldKey">Depth</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {liveInfos[color].liveInfo?.info.depth} /{" "}
            {liveInfos[color].liveInfo?.info.seldepth}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">Nodes</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.nodes)}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">NPS</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.speed)}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">TB Hits</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.tbhits)}
          </td>
        ))}
      </tr>

      <tr className="borderBottom">
        <td className="engineFieldKey">Hashfull</td>
        {colors.map((color) => (
          <td key={color} className="engineFieldValue">
            {liveInfos[color].liveInfo?.info.hashfull}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey"></td>
        {colors.map((color) => (
          <td key={color} className="engineEvaluation">
            {liveInfos[color].liveInfo?.info.score}
          </td>
        ))}
      </tr>
    </tbody>
  );
}
