import { useState } from "react";
import { Schedule } from "./Schedule";
import { TwitchChat } from "./TwitchChat";
import { useEventStore } from "@/context/EventContext";
import { Select } from "antd";

const TABS = ["Schedule", "Chat"] as const;
type Tab = (typeof TABS)[number];

export const ScheduleWindow = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Schedule");

  const engines = useEventStore((state) => state.engines);
  const activeEvent = useEventStore((state) => state.activeEvent);

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
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}

        <Select
          onChange={setSelectedEngineId}
          style={{ width: 140 }}
          value={selectedEngineId}
          options={[
            { value: "", label: "All Engines" },
            ...engines.map((engine) => ({
              value: engine.id,
              label: engine.name,
            })),
          ]}
        />
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
