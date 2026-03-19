import { useEventStore } from "../../context/EventContext";
import { Spinner } from "../Loading";
import { Schedule } from "./Schedule";

export const ScheduleWindow = () => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeGame = useEventStore((state) => state.activeGame);

  return (
    <div className="scheduleWindow">
      <h4>Schedule</h4>
      {activeEvent && activeGame ? (
        <Schedule />
      ) : (
        <div className="sectionSpinner">
          <Spinner />
        </div>
      )}
    </div>
  );
};
