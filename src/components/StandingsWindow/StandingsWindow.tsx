import { memo } from "react";

import { useEventStore } from "../../context/EventContext";

import { Spinner } from "../Loading";
import { StandingsTable } from "./StandingsTable";

import { usePopup } from "../../context/PopupContext";

export const StandingsWindow = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeGame = useEventStore((state) => state.activeGame);

  const setPopupState = usePopup((state) => state.setPopupState);

  return (
    <div className="standingsWindow">
      <h4>Standings</h4>
      {activeEvent && activeGame ? (
        <>
          <button
            onClick={() => setPopupState("crosstable")}
            title="View head-to-head results between all engines"
          >
            Show Crosstable
          </button>
          <StandingsTable />
        </>
      ) : (
        <div className="sectionSpinner">
          <Spinner />
        </div>
      )}
    </div>
  );
});
