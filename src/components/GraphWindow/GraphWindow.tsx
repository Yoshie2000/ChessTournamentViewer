import { Spinner } from "../Loading";
import { GameGraph } from "./GameGraph";
import { useEventStore } from "../../context/EventContext";
import { memo } from "react";

export const GraphWindow = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeGame = useEventStore((state) => state.activeGame);

  return (
    <div className="graphWindow">
      {activeEvent && activeGame ? (
        <GameGraph />
      ) : (
        <>
          <div className="sectionSpinner">
            <Spinner />
          </div>
        </>
      )}
    </div>
  );
});
