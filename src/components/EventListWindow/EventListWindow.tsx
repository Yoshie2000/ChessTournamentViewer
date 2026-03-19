import { memo } from "react";
import { useEventStore } from "../../context/EventContext";

import { LuSettings } from "react-icons/lu";
import { EventList } from "./EventList";
import { usePopup } from "../../context/PopupContext";

export const EventListWindow = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);

  const setPopupState = usePopup((state) => state.setPopupState);

  const eventName = activeEvent?.tournamentDetails.name;

  return (
    <header className="topBar">
      <div className="currentEvent">
        Chess Tournament Viewer
        {eventName ? " - " + eventName : ""}
      </div>
      <div className="settingsRow">
        <EventList />
        <button onClick={() => setPopupState("settings")} title="Settings">
          <LuSettings />
        </button>
      </div>
    </header>
  );
});
