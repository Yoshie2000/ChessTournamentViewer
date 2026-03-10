import { useEventStore } from "../context/EventContext";
import type { CCCEventsListUpdate, CCCEventUpdate } from "../types";
import "./EventList.css";

type EventListProps = {
  eventList: CCCEventsListUpdate | undefined;
  selectedEvent: CCCEventUpdate | undefined;
};

export function EventList({ eventList, selectedEvent }: EventListProps) {
  const requestEvent = useEventStore((state) => state.requestEvent);

  if (!eventList || !selectedEvent) {
    return (
      <select className="eventListContainer">
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      className="eventListContainer"
      value={selectedEvent.tournamentDetails.tNr}
      onChange={(event) => requestEvent(undefined, String(event.target.value))}
    >
      {eventList.events.map((event) => (
        <option key={event.id} value={event.id}>
          {event.name}{" "}
          {event.tc && (
            <>
              ({event.tc.init}+{event.tc.incr})
            </>
          )}
        </option>
      ))}
    </select>
  );
}
