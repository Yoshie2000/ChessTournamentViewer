import { useState } from "react";
import { EnginePV } from "./EnginePV";
import { EngineStats } from "./EngineStats";
import "./EngineWindowMobile.css";
import { KibitzerTableHeader } from "./EngineWindow";
import type { EngineColor } from "../../LiveInfo";

const TABS = ["Engines", "Engine PVs", "Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

type EngineWindowMobileProps = { activeKibitzers: EngineColor[] };

export function EngineWindowMobile({
  activeKibitzers,
}: EngineWindowMobileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Engines");

  const headerEngines = activeTab.includes("Engine")
    ? PLAYING_ENGINES
    : activeKibitzers;

  const firstColumn = activeTab === "Engines" || activeTab === "Kibitzers";

  return (
    <div className="engineWindowMobile">
      <div className="engineTabs">
        {TABS.filter(
          (tab) => !tab.includes("Kibitzer") || activeKibitzers.length > 0
        ).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <table>
        <colgroup>
          {firstColumn && <col style={{ width: "50px" }} />}
          {headerEngines.map((color) => (
            <col key={color} />
          ))}
        </colgroup>

        <thead>
          <tr>
            {firstColumn && <th className="engineFieldKey"></th>}
            {headerEngines.map((color) => (
              <th key={color}>
                <KibitzerTableHeader color={color} />
              </th>
            ))}
          </tr>
        </thead>

        {activeTab === "Engines" && <EngineStats colors={PLAYING_ENGINES} />}

        {activeTab === "Engine PVs" && (
          <tbody>
            <tr>
              {PLAYING_ENGINES.map((color) => (
                <td key={color}>
                  <EnginePV color={color} />
                </td>
              ))}
            </tr>
          </tbody>
        )}

        {activeTab === "Kibitzers" && <EngineStats colors={activeKibitzers} />}

        {activeTab === "Kibitzer PVs" && (
          <tbody>
            <tr>
              {activeKibitzers.map((color) => (
                <td key={color}>
                  <EnginePV color={color} />
                </td>
              ))}
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
