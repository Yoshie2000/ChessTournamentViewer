import { useEffect, useRef, useState } from "react";
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

import { LAYOUTS, type Layout } from "./Layout";
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
    `${targetH * cellSize - 8}px`
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

type LayoutContainerProps = { width: number; height: number };

function LinearContainer({ width, height }: LayoutContainerProps) {
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

function GridContainer({ width, height }: LayoutContainerProps) {
  const breakpoint = Number(
    Object.keys(LAYOUTS)
      .toSorted((a, b) => Number(b) - Number(a))
      .find((px) => width > Number(px))!
  );
  const [layout, setLayout] = useState<Layout>(LAYOUTS[breakpoint]);

  const cellWidth = Math.floor(width / layout.columns);
  const rows = Math.floor((height - 56) / cellWidth);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstance = useRef<GridStack | null>(null);

  useEffect(() => {
    const saved = loadLayout(breakpoint);
    if (saved) {
      setLayout({ ...LAYOUTS[breakpoint], widgets: saved });
    } else {
      setLayout(LAYOUTS[breakpoint]);
    }
  }, [breakpoint]);

  useEffect(() => {
    if (!gridRef.current) return;

    gridInstance.current = GridStack.init(
      {
        column: layout.columns,
        cellHeight: `${cellWidth}px`,
        margin: 0,
        handle: ".grid-drag-handle",
        float: true,
      },
      gridRef.current
    );

    function onLayoutChange() {
      const layout = gridInstance.current?.save(false);
      if (layout && Array.isArray(layout)) {
        saveLayout(breakpoint, layout);
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
  }, [layout.movelistWidth]);

  useEffect(() => {
    if (!gridInstance.current) return;

    gridInstance.current.cellHeight(cellWidth);
    gridInstance.current.opts.maxRow = rows;
  }, [cellWidth, rows]);

  useEffect(() => {
    const boardWindowWidget = layout.widgets.find(
      (widget) => widget.id === "boardWindowWidget"
    )!;
    setBoardSize(
      boardWindowWidget.w,
      boardWindowWidget.h,
      layout.movelistWidth,
      cellWidth
    );
  }, [cellWidth, layout.movelistWidth]);

  useEffect(() => {
    if (!gridInstance.current) return;

    gridInstance.current.batchUpdate();

    layout.widgets.forEach((w) => {
      const el = gridRef.current?.querySelector(
        `[gs-id="${w.id}"]`
      ) as HTMLElement;
      if (el) {
        gridInstance.current?.update(el, { x: w.x, y: w.y, w: w.w, h: w.h });
      }
    });

    gridInstance.current.batchUpdate(false);
  }, [layout]);

  return (
    <div
      className="grid-stack grid-container"
      ref={gridRef}
      style={{ width: `${width - 8}px` }}
    >
      {layout.widgets.map((widget) => (
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
            <RiDragMove2Fill className="grid-drag-handle" color="AAA" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
