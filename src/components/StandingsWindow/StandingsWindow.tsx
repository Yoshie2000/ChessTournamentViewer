import { memo } from "react";

import { useEventStore } from "../../context/EventContext";

import { Spinner } from "../Loading";
import { StandingsTable } from "../StandingsTable";

import { usePopup } from "../../context/PopupContext";

export const StandingsWindow = memo(() => {
  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  const setPopupState = usePopup((state) => state.setPopupState);

  return (
    <div className="standingsWindow">
      <h4>Standings</h4>
      {cccEvent && cccGame ? (
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
