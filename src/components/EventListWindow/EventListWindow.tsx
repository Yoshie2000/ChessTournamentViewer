import { memo, useCallback } from "react";
import { useEventStore, type ProviderKey } from "../../context/EventContext";

import { LuSettings } from "react-icons/lu";
import { EventList } from "./EventList";
import { usePopup } from "../../context/PopupContext";

export const EventListWindow = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const activeProvider = useEventStore((state) => state.activeProvider);
  const setActiveProvider = useEventStore((state) => state.setActiveProvider);

  const setPopupState = usePopup((state) => state.setPopupState);

  const eventName = activeEvent?.tournamentDetails.name;

  const handleProviderClick = useCallback(
    (provider: ProviderKey) => {
      setActiveProvider(provider);
      setTimeout(() => {
        useEventStore.getState().requestEvent();
      }, 10);
    },
    [setActiveProvider]
  );

  return (
    <header className="topBar">
      <div className="currentEvent">
        Chess Tournament Viewer
        {eventName ? " - " + eventName : ""}
      </div>
      <div className="settingsRow">
        <EventList />
        <div className="providerTabs">
          <button
            disabled={activeProvider === "tcec"}
            onClick={() => handleProviderClick("tcec")}
            title="TCEC Live"
          >
            TCEC
          </button>
          <button
            disabled={activeProvider === "ccc"}
            onClick={() => handleProviderClick("ccc")}
            title="CCC Live"
          >
            CCC
          </button>
        </div>
        <button onClick={() => setPopupState("settings")} title="Settings">
          <LuSettings />
        </button>
      </div>
    </header>
  );
});
