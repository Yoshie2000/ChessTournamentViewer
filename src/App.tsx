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

import { LocaleProvider } from "@douyinfe/semi-ui";
import en_US from "@douyinfe/semi-ui/lib/es/locale/source/en_US";
import { useEffect } from "react";
import { usePopup } from "./context/PopupContext";

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
  useEffect(() => {
    const controller = new AbortController();

    window.addEventListener(
      "keydown",
      (e) => {
        const state = usePopup.getState();

        // TODO: cannot test that locally, need a deploy
        if (e.target instanceof HTMLDivElement) {
          const isTwitchInputElement = e.target.getAttribute("role");

          if (isTwitchInputElement) {
            e.stopPropagation();
            return;
          }
        }

        // can add/modify hotkeys there
        if (e.code === "Escape") {
          state.setPopupState("none");
        } else if (e.code === "KeyC") {
          state.setPopupState("crosstable");
        } else if (e.code === "KeyS") {
          state.setPopupState("settings");
        }
      },
      { signal: controller.signal }
    );

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <LocaleProvider locale={en_US}>
      <div className="app">
        <Popup />

        <EventListWindow />

        <EngineWindow />

        <BoardWindow />

        <StandingsWindow />

        <GraphWindow />

        <ScheduleWindow />
      </div>
    </LocaleProvider>
  );
}

export default App;
