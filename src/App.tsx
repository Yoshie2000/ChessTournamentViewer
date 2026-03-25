import { useEffect, useRef, useState, type ElementType } from "react";
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
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import "./App.css";

import { EngineWindow } from "./components/EngineWindow/EngineWindow";
import { EventListWindow } from "./components/EventListWindow/EventListWindow";
import { GraphWindow } from "./components/GraphWindow/GraphWindow";
import { StandingsWindow } from "./components/StandingsWindow/StandingsWindow";
import { BoardWindow } from "./components/BoardWindow/BoardWindow";
import { ScheduleWindow } from "./components/ScheduleWindow/ScheduleWindow";
import { Popup } from "./components/Popup/Popup";

import { useWindowSize } from "./hooks/useWindowSize";
import { loadLayout, saveLayout } from "./LocalStorage";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export type Widget = {
  id: string;
  w: number;
  h: number;
  x: number;
  y: number;
  component: ElementType;
};

const ENGINE_WINDOW_WIDGET: Widget = {
  id: "engineWindowWidget",
  w: 12,
  h: -1,
  x: 36,
  y: 0,
  component: EngineWindow,
};

const BOARD_WINDOW_WIDGET: Widget = {
  id: "boardWindowWidget",
  w: 20,
  h: 16,
  x: 16,
  y: 0,
  component: BoardWindow,
};

const STANDINGS_WINDOW_WIDGET: Widget = {
  id: "standingsWindowWidget",
  w: 16,
  h: 10,
  x: 0,
  y: 16,
  component: StandingsWindow,
};

const GRAPH_WINDOW_WIDGET: Widget = {
  id: "graphWindowWidget",
  w: 20,
  h: 10,
  x: 16,
  y: 16,
  component: GraphWindow,
};

const SCHEDULE_WINDOW_WIDGET: Widget = {
  id: "scheduleWindowWidget",
  w: 16,
  h: 16,
  x: 0,
  y: 0,
  component: ScheduleWindow,
};

export const DEFAULT_LAYOUT = [
  ENGINE_WINDOW_WIDGET,
  BOARD_WINDOW_WIDGET,
  STANDINGS_WINDOW_WIDGET,
  GRAPH_WINDOW_WIDGET,
  SCHEDULE_WINDOW_WIDGET,
];

const COLUMNS = 48;
const MOVELIST_WIDTH = 4;

function setBoardSize(width: number, height: number, cellSize: number) {
  const targetH = Math.max(
    2,
    Math.round((width - MOVELIST_WIDTH + height) / 2)
  );
  const targetW = Math.max(MOVELIST_WIDTH + 2, targetH + MOVELIST_WIDTH);

  document.documentElement.style.setProperty(
    "--boardWidth",
    `${targetW * cellSize}px`
  );
  document.documentElement.style.setProperty(
    "--boardHeight",
    `${targetH * cellSize}px`
  );
}

function App() {
  const { width, height } = useWindowSize();
  const cellSize = Math.floor(width / COLUMNS);
  const rows = Math.floor((height - 56) / cellSize);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstance = useRef<GridStack | null>(null);

  const [widgets] = useState<Widget[]>(loadLayout() ?? DEFAULT_LAYOUT);

  useEffect(() => {
    if (!gridRef.current) return;

    gridInstance.current = GridStack.init(
      {
        column: COLUMNS,
        cellHeight: `${cellSize}px`,
        margin: 0,
        handle: ".react-grid-drag-handle",
        float: true,
      },
      gridRef.current
    );

    function onLayoutChange() {
      const layout = gridInstance.current?.save(false);
      if (layout && Array.isArray(layout)) {
        saveLayout(layout);
      }
    }

    gridInstance.current.on("resizestop", onLayoutChange);
    gridInstance.current.on("dragstop", onLayoutChange);

    gridInstance.current.on("resize", (_, el) => {
      const node = el.gridstackNode;

      if (node?.id === BOARD_WINDOW_WIDGET.id) {
        setBoardSize(node.w || 0, node.h || 0, cellSize);
      }
    });

    return () => {
      if (gridInstance.current) {
        gridInstance.current.destroy(false);
        gridInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gridInstance.current) {
      gridInstance.current.cellHeight(cellSize);

      gridInstance.current.opts.maxRow = rows;
    }
  }, [cellSize, rows]);

  useEffect(() => {
    const boardWindowWidget = widgets.find(
      (widget) => widget.id === BOARD_WINDOW_WIDGET.id
    )!;
    setBoardSize(boardWindowWidget.w, boardWindowWidget.h, cellSize);
  }, [cellSize]);

  return (
    <div className="app-container">
      <Popup />
      <EventListWindow />

      <div
        className="grid-stack app-grid"
        ref={gridRef}
        style={{ width: `${width - 8}px` }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="grid-stack-item"
            gs-id={widget.id}
            gs-w={widget.w}
            gs-h={widget.h === -1 ? rows : widget.h}
            gs-x={widget.x}
            gs-y={widget.y}
          >
            <div className="grid-stack-item-content">
              <widget.component />
              <div className="react-grid-drag-handle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
