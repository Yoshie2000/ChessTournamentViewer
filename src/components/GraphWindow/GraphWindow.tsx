import { Spinner } from "../Loading";
import { GameGraph } from "./GameGraph";
import { useEventStore } from "../../context/EventContext";
import { memo } from "react";

export const GraphWindow = memo(() => {
  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  return (
    <div className="graphWindow">
      {cccEvent && cccGame ? (
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
