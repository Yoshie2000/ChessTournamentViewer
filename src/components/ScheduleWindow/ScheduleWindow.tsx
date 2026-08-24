import { useState } from "react";
import { Schedule } from "./Schedule";
import { TwitchChat } from "./TwitchChat";
import { useEventStore } from "@/context/EventContext";
import { Select, Button } from "@douyinfe/semi-ui";
import { LuDownload } from "react-icons/lu";
import { toTitleCaseTCEC } from "@/utils";

const TABS = ["Schedule", "Chat"] as const;
type Tab = (typeof TABS)[number];

export const ScheduleWindow = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Schedule");

  const engines = useEventStore((state) => state.engines);
  const activeEvent = useEventStore((state) => state.activeEvent);

  const isEventRunning = useEventStore(
    (state) => state.activeEvent?.tournamentDetails.schedule.present
  );
  const activeProvider = useEventStore((state) => state.activeProvider);

  const eventDownloadUrl =
    activeProvider === "ccc"
      ? `https://ccc-api.gcp-prod.chess.com/public/download/pgn/event/${activeEvent?.tournamentDetails.tNr}`
      : isEventRunning
        ? undefined
        : `https://ctv.yoshie2000.de/tcec/loglive/archive/${toTitleCaseTCEC(activeEvent?.tournamentDetails.tNr ?? "")}.log.xz`;

  const [selectedEngineId, setSelectedEngineId] = useState<string>("");

  const [previousEvent, setPreviousEvent] = useState(activeEvent);
  if (activeEvent !== previousEvent) {
    setPreviousEvent(activeEvent);
    setSelectedEngineId("");
  }

  return (
    <div className="scheduleWindow">
      <div className="scheduleWindowTabs">
        {TABS.map((tab) => (
          <Button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}

        <Select
          onChange={(value) => setSelectedEngineId(value as string)}
          multiple={false}
          style={{ width: 140 }}
          value={selectedEngineId}
          optionList={[
            { value: "", label: "All Engines" },
            ...engines.map((engine) => ({
              value: engine.id,
              label: engine.name,
              showTick: false,
            })),
          ]}
        />

        {eventDownloadUrl && (
          <a target="_blank" href={eventDownloadUrl}>
            <Button title="Download Event Log">
              <LuDownload />
            </Button>
          </a>
        )}
      </div>

      <div
        className="tab"
        style={activeTab === "Schedule" ? { display: "none" } : undefined}
      >
        <TwitchChat />
      </div>

      <div
        className="tab"
        style={activeTab === "Chat" ? { display: "none" } : undefined}
      >
        <Schedule selectedEngineId={selectedEngineId} />
      </div>
    </div>
  );
};
