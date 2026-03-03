import { useEventStore } from "../../context/EventContext";
import { LuSettings } from "react-icons/lu";
import { EventList } from "../EventList";
import { memo } from "react";

type EventListWindowProps = {
  requestEvent: (gameNr?: string, eventNr?: string) => void;
  setPopupState: (state: string) => void;
};

export const EventListWindow = memo(
  ({ requestEvent, setPopupState }: EventListWindowProps) => {
    const cccEvent = useEventStore((state) => state.cccEvent);
    const cccEventList = useEventStore((state) => state.cccEventList);

    return (
      <header className="topBar">
        <div className="currentEvent">
          Chess Tournament Viewer
          {cccEvent?.tournamentDetails.name
            ? " - " + cccEvent?.tournamentDetails.name
            : ""}
        </div>
        <div className="settingsRow">
          <EventList
            eventList={cccEventList || undefined}
            requestEvent={requestEvent}
            selectedEvent={cccEvent || undefined}
          />
          <button onClick={() => setPopupState("settings")} title="Settings">
            <LuSettings />
          </button>
        </div>
      </header>
    );
  }
);
