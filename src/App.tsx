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
import { RiDragMove2Fill } from "react-icons/ri";
import { LiveMoveList } from "./components/BoardWindow/LiveMoveList";

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

export type Layout = {
  columns: number;
  movelistWidth: number;
  widgets: Widget[];
};

export const LAYOUTS: Record<number, Layout> = {
  1400: {
    columns: 47,
    movelistWidth: 4,
    widgets: [
      {
        id: "engineWindowWidget",
        w: 13,
        h: 21,
        x: 34,
        y: 0,
        component: EngineWindow,
      },
      {
        id: "boardWindowWidget",
        w: 18,
        h: 14,
        x: 16,
        y: 0,
        component: BoardWindow,
      },
      {
        id: "standingsWindowWidget",
        w: 16,
        h: 7,
        x: 0,
        y: 14,
        component: StandingsWindow,
      },
      {
        id: "graphWindowWidget",
        w: 18,
        h: 7,
        x: 16,
        y: 14,
        component: GraphWindow,
      },
      {
        id: "scheduleWindowWidget",
        w: 16,
        h: 14,
        x: 0,
        y: 0,
        component: ScheduleWindow,
      },
    ],
  },
  0: {
    columns: 47,
    movelistWidth: 4,
    widgets: [
      {
        id: "engineWindowWidget",
        w: 13,
        h: 21,
        x: 34,
        y: 0,
        component: EngineWindow,
      },
      {
        id: "boardWindowWidget",
        w: 18,
        h: 14,
        x: 16,
        y: 0,
        component: BoardWindow,
      },
      {
        id: "standingsWindowWidget",
        w: 16,
        h: 7,
        x: 0,
        y: 14,
        component: StandingsWindow,
      },
      {
        id: "graphWindowWidget",
        w: 18,
        h: 7,
        x: 16,
        y: 14,
        component: GraphWindow,
      },
      {
        id: "scheduleWindowWidget",
        w: 16,
        h: 14,
        x: 0,
        y: 0,
        component: ScheduleWindow,
      },
    ],
  },
};

function setBoardSize(
  width: number,
  height: number,
  movelistWidth: number,
  cellSize: number
) {
  const targetH = Math.max(2, Math.round((width - movelistWidth + height) / 2));
  const targetW = Math.max(movelistWidth + 2, targetH + movelistWidth);

  document.documentElement.style.setProperty(
    "--boardWidth",
    `${targetW * cellSize}px`
  );
  document.documentElement.style.setProperty(
    "--boardHeight",
    `${targetH * cellSize}px`
  );
  document.documentElement.style.setProperty(
    "--movelist-width",
    `${movelistWidth * cellSize}px`
  );
}

function App() {
  const { width, height } = useWindowSize();

  return (
    <div className="app-container">
      <Popup />
      <EventListWindow />

      {width <= 775 ? (
        <LinearContainer width={width} height={height} />
      ) : (
        <GridContainer width={width} height={height} />
      )}
    </div>
  );
}

type GridContainerProps = { width: number; height: number };

function LinearContainer({ width, height }: GridContainerProps) {
  useEffect(() => {
    setBoardSize(width - 16, width - 16, 0, 1);
  }, [width, height]);

  return (
    <div className="linear-container">
      <EngineWindow />

      <BoardWindow />

      <LiveMoveList />

      <StandingsWindow />

      <GraphWindow />

      <ScheduleWindow />
    </div>
  );
}

function GridContainer({ width, height }: GridContainerProps) {
  const layoutIdx = Object.keys(LAYOUTS)
    .toSorted((a, b) => Number(b) - Number(a))
    .find((px) => width > Number(px))!;
  const layout = LAYOUTS[Number(layoutIdx)];
  console.log(layout);

  const cellWidth = Math.floor(width / layout.columns);
  const rows = Math.floor((height - 56) / cellWidth);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstance = useRef<GridStack | null>(null);

  const [widgets] = useState<Widget[]>(loadLayout() ?? layout.widgets);

  useEffect(() => {
    if (!gridRef.current) return;

    gridInstance.current = GridStack.init(
      {
        column: layout.columns,
        cellHeight: `${cellWidth}px`,
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

      if (node?.id === "boardWindowWidget") {
        setBoardSize(node.w || 0, node.h || 0, layout.movelistWidth, cellWidth);
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
    if (!gridInstance.current) return;

    gridInstance.current.cellHeight(cellWidth);
    gridInstance.current.opts.maxRow = rows;
  }, [cellWidth, rows]);

  useEffect(() => {
    const boardWindowWidget = widgets.find(
      (widget) => widget.id === "boardWindowWidget"
    )!;
    setBoardSize(
      boardWindowWidget.w,
      boardWindowWidget.h,
      layout.movelistWidth,
      cellWidth
    );
  }, [cellWidth]);

  return (
    <div
      className="grid-stack grid-container"
      ref={gridRef}
      style={{ width: `${width - 8}px` }}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="grid-stack-item"
          gs-id={widget.id}
          gs-w={widget.w}
          gs-h={widget.h}
          gs-x={widget.x}
          gs-y={widget.y}
        >
          <div className="grid-stack-item-content">
            <widget.component />
            <RiDragMove2Fill className="react-grid-drag-handle" color="AAA" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
