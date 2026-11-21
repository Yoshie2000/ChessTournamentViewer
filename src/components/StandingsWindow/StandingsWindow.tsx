import { memo } from "react";

import { useEventStore } from "../../context/EventContext";

import { Spinner } from "../Loading";
import { StandingsTable } from "./StandingsTable";

import { usePopup } from "../../context/PopupContext";
import { Button } from "@douyinfe/semi-ui";
import CupMatchupsTable from "./CupMatchupsTable";

export const StandingsWindow = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeGame = useEventStore((state) => state.activeGame);

  const setPopupState = usePopup((state) => state.setPopupState);
  const isCup = !!activeEvent?.tournamentDetails.cupMatches;

  return (
    <div className="standingsWindow">
      <h4>{isCup ? "Matchups" : "Standings"}</h4>
      {activeEvent && activeGame ? (
        !isCup ? (
          <>
            <Button
              onClick={() => setPopupState("crosstable")}
              title="View head-to-head results between all engines"
            >
              Show Crosstable
            </Button>
            <StandingsTable />
          </>
        ) : (
          <>
            <Button
              onClick={() => setPopupState("cupBrackets")}
              title="View cup brackets"
            >
              Show Brackets
            </Button>
            <CupMatchupsTable />
          </>
        )
      ) : (
        <div className="sectionSpinner">
          <Spinner />
        </div>
      )}
    </div>
  );
});
