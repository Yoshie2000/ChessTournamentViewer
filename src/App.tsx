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
import { ResponsiveGridLayout } from "react-grid-layout";
import { useWindowSize } from "./hooks/useWindowSize";
import { useEffect } from "react";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const COLUMNS = 48;

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

  console.log(cellSize, width, height, rows)

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
        rowHeight={cellSize}
        autoSize={true}
        containerPadding={[0, 0]}
        margin={[0, 0]}
        maxRows={rows}
        dragConfig={{ enabled: true, handle: ".react-grid-drag-handle" }}
      >
        <div key={5} data-grid={{ w: 12, h: rows, x: 36, y: 0 }}>
          <EngineWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={1} data-grid={{ w: 20, h: 16, x: 16, y: 0 }}>
          <BoardWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={3} data-grid={{ w: 16, h: 10, x: 0, y: 24 }}>
          <StandingsWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={4} data-grid={{ w: 20, h: 10, x: 16, y: 16 }}>
          <GraphWindow />
          <div className="react-grid-drag-handle" />
        </div>

        <div key={2} data-grid={{ w: 16, h: 16, x: 0, y: 0 }}>
          <ScheduleWindow />
          <div className="react-grid-drag-handle" />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

export default App;
