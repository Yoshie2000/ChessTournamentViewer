import { memo, useCallback } from "react";
import { useEventStore, type ProviderKey } from "../../context/EventContext";

import { LuSettings } from "react-icons/lu";
import { EventList } from "./EventList";
import { usePopup } from "../../context/PopupContext";
import { Button, SplitButtonGroup } from "@douyinfe/semi-ui";

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
          <SplitButtonGroup>
            <Button
              disabled={activeProvider === "tcec"}
              className={activeProvider === "tcec" ? "active" : undefined}
              onClick={() => handleProviderClick("tcec")}
              title="TCEC Live"
            >
              TCEC
            </Button>
            <Button
              disabled={activeProvider === "ccc"}
              className={activeProvider === "ccc" ? "active" : undefined}
              onClick={() => handleProviderClick("ccc")}
              title="CCC Live"
            >
              CCC
            </Button>
          </SplitButtonGroup>
        </div>
        <Button onClick={() => setPopupState("settings")} title="Settings">
          <LuSettings />
        </Button>
      </div>
    </header>
  );
});
