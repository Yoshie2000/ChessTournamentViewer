import { Line } from "react-chartjs-2";
import type { CCCLiveInfo } from "../../types";
import { memo, useState } from "react";
import "./GameGraph.css";
import { formatLargeNumber, formatTime } from "../EngineWindow/EngineCard";
import type { PointElement } from "chart.js";
import { useLiveInfo } from "../../context/LiveInfoContext";
import type { LiveEngineData } from "../../LiveInfo";
import { useInterval } from "../../hooks/useInterval";

const COLORS = {
  white: "rgba(255, 255, 255, 0.7)",
  black: "rgba(0, 0, 0, 0.7)",
  red: "rgba(255, 31, 31, 0.7)",
  green: "rgba(23, 160, 29, 0.7)",
  blue: "rgba(21, 101, 192, 0.7)",
};
const evalScale = 0.45;
const mateScaled = 4;
const MODES = [
  {
    name: "Eval",
    map: function (liveInfo?: CCCLiveInfo) {
      if (!liveInfo) return NaN;
      else if (liveInfo.info.score.includes("+M")) return 64.0;
      else if (liveInfo.info.score.includes("-M")) return -64.0;
      else return Math.min(Math.max(Number(liveInfo!.info.score), -49.0), 49.0);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo?.info.score ?? "-";
    },
    scaling: function (value: number) {
      if (value >= mateScaled) return 64;
      else if (value <= -mateScaled) return -64;
      return Math.tan(value * Math.atan(evalScale)) / evalScale;
    },
    scaleData: function (value: number) {
      if (value == 64) return mateScaled;
      else if (value == -64) return -mateScaled;
      return Math.atan(value * evalScale) / Math.atan(evalScale);
    },
  },
  {
    name: "Depth",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.depth);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo?.info.depth ?? "-";
    },
    scaling: function (value: number) {
      return value;
    },
    scaleData: function (value: number) {
      return value;
    },
  },
  {
    name: "Nodes",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.nodes);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return formatLargeNumber(liveInfo?.info.nodes);
    },
    scaling: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 2);
    },
    scaleData: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 1 / 2);
    },
  },
  {
    name: "Time",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.time) / 1000;
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo ? formatTime(Number(liveInfo.info.time)) : "-";
    },
    scaling: function (value: number) {
      return value;
    },
    scaleData: function (value: number) {
      return value;
    },
  },
  {
    name: "Speed",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.speed);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return formatLargeNumber(liveInfo?.info.speed);
    },
    scaling: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 2);
    },
    scaleData: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 1 / 2);
    },
  },
  {
    name: "TB Hits",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.tbhits);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return formatLargeNumber(liveInfo?.info.tbhits);
    },
    scaling: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 2);
    },
    scaleData: function (value: number) {
      return Math.sign(value) * Math.pow(Math.abs(value), 1 / 2);
    },
  },
  {
    name: "Hashfull",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.hashfull);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo?.info.hashfull ?? "-";
    },
    scaling: function (value: number) {
      return value;
    },
    scaleData: function (value: number) {
      return value;
    },
  },
  {
    name: "Agree",
    map: function () {
      return 0;
    },
    mapLabel: function () {
      return "";
    },
    scaling: function (value: number) {
      return value;
    },
    scaleData: function () {
      return 1;
    },
  },
];

export const GameGraph = memo(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const [liveInfosObj, setLiveInfosObj] = useState<LiveEngineData>(
    useLiveInfo.getInitialState().liveEngineData
  );
  const [engineAgreePly, setEngineAgreePly] = useState<(number | undefined)[]>(
    []
  );
  const [kibitzerAgreePly, setKibitzerAgreePly] = useState<
    (number | undefined)[]
  >([]);
  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);

  useInterval((state) => {
    setLiveInfosObj(state.liveEngineData);
    setEngineAgreePly(state.engineAgreePly);
    setKibitzerAgreePly(state.kibitzerAgreePly);
    setCurrentMoveNumber(state.currentMoveNumber);
  });

  const liveInfos = {
    white: liveInfosObj.white.liveInfo,
    black: liveInfosObj.black.liveInfo,
    green: liveInfosObj.green.liveInfo,
    red: liveInfosObj.red.liveInfo,
    blue: liveInfosObj.blue.liveInfo,
  };

  const [mode, setMode] = useState(0);

  const bookPlies = Math.min(
    liveInfos.white.findIndex((liveInfo) => !!liveInfo),
    liveInfos.black.findIndex((liveInfo) => !!liveInfo)
  );

  const colors = Object.keys(liveInfos) as (keyof typeof liveInfos)[];
  const lengths = colors.map((color) => liveInfos[color].length);
  const labels = Array.from(
    { length: Math.max(...lengths) - bookPlies },
    (_, i) => String(i + 1 + bookPlies)
  );

  const datasets =
    MODES[mode].name !== "Agree"
      ? colors.map((color) => {
          return {
            label: color[0].toUpperCase() + color.slice(1).toLowerCase(),
            data: liveInfos[color]
              .slice(bookPlies)
              .map(MODES[mode].map)
              .map(MODES[mode].scaleData),
            dataLabels: liveInfos[color]
              .slice(bookPlies)
              .map(MODES[mode].mapLabel),
            borderColor: COLORS[color],
            backgroundColor: COLORS[color],
            spanGaps: true,
          };
        })
      : ["Engines", "Kibitzers"].map((label) => {
          const agreePly = (
            label === "Engines" ? engineAgreePly : kibitzerAgreePly
          ).slice(bookPlies);
          const color = label === "Engines" ? "#c548c5" : "#60299e";
          return {
            label,
            data: agreePly,
            dataLabels: agreePly.map((ply) => String(ply)),
            borderColor: color,
            backgroundColor: color,
            spanGaps: true,
          };
        });

  return (
    <div className="gameGraph">
      <div className="modeSelectorList">
        {MODES.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setMode(i)}
            className={"modeSelector" + (mode === i ? " active" : "")}
            title={m.name}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="graphWrapper">
        <Line
          options={{
            responsive: true,
            maintainAspectRatio: false,
            elements: { line: { tension: 0 } },
            animation: {
              duration: reducedMotion ? 0 : undefined /* default */,
            },
            animations: {
              y: {
                from: (ctx: any) => {
                  const { chart, datasetIndex, dataIndex } = ctx;
                  const yScale = chart.scales.y;

                  const element = ctx.element as PointElement | undefined;
                  if (
                    !element?.$animations?.y &&
                    dataIndex ===
                      chart.data.datasets[datasetIndex].data.length - 1
                  ) {
                    // Point is new, and point is the last point of the chart
                    const dataset = chart.data.datasets[datasetIndex];
                    for (let i = dataIndex - 1; i >= 0; i--) {
                      const val = dataset.data[i];
                      if (typeof val === "number" && !isNaN(val)) {
                        return yScale.getPixelForValue(val);
                      }
                    }
                  }

                  // Default animation fallback
                  return undefined;
                },
              },
            },
            plugins: {
              legend: { display: false, onClick: undefined },
              // @ts-ignore
              verticalLine: { index: currentMoveNumber - bookPlies },
              tooltip: {
                callbacks: {
                  label: (
                    context // @ts-ignore
                  ) => context.dataset.dataLabels[context.dataIndex],
                },
              },
            },
            onClick: (_, elements) => {
              if (!elements || !elements[0]) return;
              useLiveInfo
                .getState()
                .setCurrentMoveNumber(() => elements[0].index + bookPlies);
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => {
                    const scaledValue = MODES[mode].scaling(Number(value));
                    switch (mode) {
                      case 0:
                        if (scaledValue >= 64) return "Mate";
                        if (scaledValue <= -64) return "-Mate";
                        return scaledValue.toFixed(2);
                      case 3:
                        return formatTime(1000 * scaledValue);
                      default:
                        return formatLargeNumber(String(scaledValue));
                    }
                  },
                },
                beginAtZero: true,
                grid: {
                  color: (context) => {
                    const val = context.tick.value;
                    if (mode === 0 && (val === 1 || val === -1))
                      return "rgba(0, 0, 0, 0.25)";
                    if (mode === 0 && val === 0) return "rgba(0, 0, 0, 0.5)";
                    return "rgba(0, 0, 0, 0.05)";
                  },
                },
              },
            },
          }}
          plugins={[
            {
              id: "verticalLine",
              afterDraw: (chart, _, options) => {
                const {
                  ctx,
                  chartArea: { top, bottom, left, right },
                  scales: { x },
                } = chart;

                const xPos = x.getPixelForValue(options.index);

                if (xPos >= left && xPos <= right) {
                  ctx.save();
                  ctx.beginPath();

                  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
                  ctx.lineWidth = 1;

                  ctx.moveTo(xPos, top);
                  ctx.lineTo(xPos, bottom);
                  ctx.stroke();

                  ctx.restore();
                }
              },
            },
          ]}
          data={{ labels, datasets }}
        />
      </div>
    </div>
  );
});
