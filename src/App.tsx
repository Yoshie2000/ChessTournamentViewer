import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import "./App.css";
import { EngineWindow } from "./components/EngineWindow/EngineWindow";
import { EventListWindow } from "./components/EventListWindow/EventListWindow";
import { GraphWindow } from "./components/GraphWindow/GraphWindow";
import { StandingsWindow } from "./components/StandingsWindow/StandingsWindow";

import { BoardWindow } from "./components/BoardWindow/BoardWindow";
import { ScheduleWindow } from "./components/ScheduleWindow/ScheduleWindow";
import { Popup } from "./components/Popup/Popup";
import {
  ResponsiveGridLayout,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import { useWindowSize } from "./hooks/useWindowSize";
import { useEffect, useState } from "react";
import { useSettings } from "./context/SettingsContext";
import type { LayoutConstraint } from "react-grid-layout/core";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const COLUMNS = 48;
const MOVELIST_WIDTH = 4;

const boardConstraint: LayoutConstraint = {
  name: "boardConstraint",
  constrainSize(_, w, h, __, _context) {
    const targetH = Math.round((w - MOVELIST_WIDTH + h) / 2);
    const targetW = targetH + MOVELIST_WIDTH;
    return {
      w: Math.max(MOVELIST_WIDTH + 2, targetW),
      h: Math.max(2, targetH),
    };
  },
};

function App() {
  const { width, height } = useWindowSize();
  const cellSize = Math.floor(width / COLUMNS);
  const rows = Math.floor((height - 56) / cellSize);

  const boardWidth = 20 * cellSize;
  const boardHeight = 16 * cellSize;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--boardWidth",
      `${boardWidth}px`
    );
    document.documentElement.style.setProperty(
      "--boardHeight",
      `${boardHeight}px`
    );
  }, [boardWidth, boardHeight]);

  const [layout] = useState<Layout>([
    { i: "1", w: 20, h: 16, x: 16, y: 0, constraints: [boardConstraint] },
    { i: "2", w: 16, h: 16, x: 0, y: 0 },
    { i: "3", w: 16, h: 10, x: 0, y: 24 },
    { i: "4", w: 20, h: 10, x: 16, y: 16 },
    { i: "5", w: 12, h: rows, x: 36, y: 0 },
  ]);

  const onResize = (
    _: Layout,
    _2: LayoutItem | null,
    newItem: LayoutItem | null
  ) => {
    if (newItem?.i === "1") {
      document.documentElement.style.setProperty(
        "--boardWidth",
        `${newItem.w * cellSize}px`
      );
      document.documentElement.style.setProperty(
        "--boardHeight",
        `${newItem.h * cellSize}px`
      );
    }
  };

  function onResizeStart() {
    useSettings.setState({ freezeUpdates: true });
  }

  function onResizeStop() {
    useSettings.setState({ freezeUpdates: false });
  }

  return (
    <div className="app-container">
      <Popup />
      <EventListWindow />

      <ResponsiveGridLayout
        className="app-grid"
        width={width - 8}
        cols={{
          lg: COLUMNS,
          md: COLUMNS,
          sm: COLUMNS,
          xs: COLUMNS,
          xxs: COLUMNS,
        }}
        onResizeStart={onResizeStart}
        onResizeStop={onResizeStop}
        layouts={{ lg: layout }}
        onResize={onResize}
        rowHeight={cellSize}
        autoSize={true}
        containerPadding={[0, 0]}
        margin={[0, 0]}
        maxRows={rows}
        dragConfig={{ enabled: true, handle: ".react-grid-drag-handle" }}
      >
        <div key={"5"}>
          <EngineWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={"1"}>
          <BoardWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={"3"}>
          <StandingsWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={"4"}>
          <GraphWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={"2"}>
          <ScheduleWindow />
          <div className="react-grid-drag-handle" />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

export default App;
