import { Line } from "react-chartjs-2";
import type { CCCEngine, CCCLiveInfo } from "../types";
import { useState } from "react";
import "./GameGraph.css";
import type { LiveInfoEntry } from "./LiveInfo";
import { formatLargeNumber, formatTime } from "./EngineCard";

type GameGraphProps = {
  liveInfosWhite: LiveInfoEntry[];
  liveInfosBlack: LiveInfoEntry[];
  liveInfosKibitzer: LiveInfoEntry[];
  white: CCCEngine;
  black: CCCEngine;
  setCurrentMoveNumber: (moveNumber: number) => void;
  currentMoveNumber: number;
};

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
  },
  {
    name: "Depth",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.depth);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo?.info.depth ?? "-";
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
  },
  {
    name: "Time",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.time) / 1000;
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return liveInfo ? formatTime(Number(liveInfo.info.time)) : "-";
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
  },
  {
    name: "TB Hits",
    map: function (liveInfo?: CCCLiveInfo) {
      return Number(liveInfo?.info.tbhits);
    },
    mapLabel: function (liveInfo?: CCCLiveInfo) {
      return formatLargeNumber(liveInfo?.info.tbhits);
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
  },
];

export function GameGraph({
  liveInfosBlack,
  liveInfosWhite,
  white,
  black,
  liveInfosKibitzer,
  setCurrentMoveNumber,
  currentMoveNumber,
}: GameGraphProps) {
  const [mode, setMode] = useState(0);

  const bookPlies = liveInfosWhite.findIndex((liveInfo) => !!liveInfo);

  const labels = Array.from(
    {
      length:
        Math.max(
          liveInfosWhite.length,
          liveInfosBlack.length,
          liveInfosKibitzer.length
        ) - bookPlies,
    },
    (_, i) => String(i + 1 + bookPlies)
  );

  function scaleData(value: number) {
    return Math.sign(value) * Math.pow(Math.abs(value), 1 / 2);
  }

  const data = {
    labels,
    datasets: [
      {
        label: black.name,
        data: liveInfosBlack
          .slice(bookPlies)
          .map(MODES[mode].map)
          .map(scaleData),
        dataLabels: liveInfosBlack.slice(bookPlies).map(MODES[mode].mapLabel),
        borderColor: "rgba(0, 0, 0, 0.7)",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        spanGaps: true,
      },
      {
        label: white.name,
        data: liveInfosWhite
          .slice(bookPlies)
          .map(MODES[mode].map)
          .map(scaleData),
        dataLabels: liveInfosWhite.slice(bookPlies).map(MODES[mode].mapLabel),
        borderColor: "rgba(255, 255, 255, 0.7)",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        spanGaps: true,
      },
      {
        label: "Kibitzer",
        data: liveInfosKibitzer
          .slice(bookPlies)
          .map(MODES[mode].map)
          .map(scaleData),
        dataLabels: liveInfosKibitzer
          .slice(bookPlies)
          .map(MODES[mode].mapLabel),
        borderColor: "rgba(21, 101, 192, 0.7)",
        backgroundColor: "rgba(21, 101, 192, 0.7)",
        spanGaps: true,
      },
    ],
  };

  return (
    <div className="gameGraph">
      <div className="modeSelectorList">
        {MODES.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setMode(i)}
            className={"modeSelector" + (mode === i ? " active" : "")}
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
              setCurrentMoveNumber(elements[0].index + bookPlies);
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => {
                    const scaledValue =
                      Math.sign(Number(value)) *
                      Math.pow(Math.abs(Number(value)), 2);
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
          data={data}
        />
      </div>
    </div>
  );
}
