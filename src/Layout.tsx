import type { ElementType } from "react";
import { BoardWindow } from "./components/BoardWindow/BoardWindow";
import { EngineWindow } from "./components/EngineWindow/EngineWindow";
import { GraphWindow } from "./components/GraphWindow/GraphWindow";
import { ScheduleWindow } from "./components/ScheduleWindow/ScheduleWindow";
import { StandingsWindow } from "./components/StandingsWindow/StandingsWindow";

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
    movelistWidth: 4.2,
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
    movelistWidth: 10,
    widgets: [
      {
        id: "engineWindowWidget",
        w: 23,
        h: 18,
        x: 24,
        y: 20,
        component: EngineWindow,
      },
      {
        id: "boardWindowWidget",
        w: 30,
        h: 20,
        x: 0,
        y: 0,
        component: BoardWindow,
      },
      {
        id: "standingsWindowWidget",
        w: 17,
        h: 20,
        x: 30,
        y: 0,
        component: StandingsWindow,
      },
      {
        id: "graphWindowWidget",
        w: 47,
        h: 15,
        x: 0,
        y: 35,
        component: GraphWindow,
      },
      {
        id: "scheduleWindowWidget",
        w: 24,
        h: 18,
        x: 0,
        y: 20,
        component: ScheduleWindow,
      },
    ],
  },
};
