import { useState } from "react";
import { Schedule } from "./Schedule";
import { TwitchChat } from "./TwitchChat";

const TABS = ["Schedule", "Chat"] as const;
type Tab = (typeof TABS)[number];

export const ScheduleWindow = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Schedule");

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
        <Schedule />
      </div>
    </div>
  );
};
