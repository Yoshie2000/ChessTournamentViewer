import { memo } from "react";
import { useEventStore } from "../../context/EventContext";

import { LuSettings } from "react-icons/lu";
import { EventList } from "../EventList";

import { usePopup } from "../../context/PopupContext";

export const EventListWindow = memo(() => {
  const cccEvent = useEventStore((state) => state.cccEvent);
  const cccEventList = useEventStore((state) => state.cccEventList);

  const setPopupState = usePopup((state) => state.setPopupState);

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
          selectedEvent={cccEvent || undefined}
        />
        <button onClick={() => setPopupState("settings")} title="Settings">
          <LuSettings />
        </button>
      </div>
    </header>
  );
});
