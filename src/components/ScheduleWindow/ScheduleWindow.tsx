import { useEventStore } from "../../context/EventContext";
import { Spinner } from "../Loading";
import { Schedule } from "../Schedule";

export const ScheduleWindow = () => {
  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccGame = useEventStore((state) => state.cccGame);

  return (
    <div className="scheduleWindow">
      <h4>Schedule</h4>
      {cccEvent && cccGame ? (
        <Schedule />
      ) : (
        <div className="sectionSpinner">
          <Spinner />
        </div>
      )}
    </div>
  );
};
