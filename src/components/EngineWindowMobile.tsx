import { useState } from "react";
import { EnginePV } from "./EnginePV";
import { EngineStats } from "./EngineStats";
import { findPvDisagreementPoint } from "../utils";
import "./EngineWindowMobile.css";
import { useLiveInfo } from "../context/LiveInfoContext";
import { KibitzerTableHeader } from "./EngineWindow";
import type { EngineColor } from "../LiveInfo";
import { useShallow } from "zustand/shallow";

const TABS = ["Engines", "Engine PVs", "Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindowMobile() {
  const [activeTab, setActiveTab] = useState<Tab>("Engines");

  const {
    kibitzerDisagreement,
    playingEnginesDisagreement,
    activeKibitzersJson,
  } = useLiveInfo(
    useShallow((state) => {
      const liveInfos = state.liveInfos;

      const activeKibitzers = (["green", "blue", "red"] as const).filter(
        (color) => !!liveInfos[color].liveInfo
      );

      const kibitzerLiveInfos = activeKibitzers.map(
        (color) => liveInfos[color].liveInfo
      );
      const playingEnginesLiveInfos = (["white", "black"] as const).map(
        (color) => liveInfos[color].liveInfo
      );
      return {
        kibitzerDisagreement: findPvDisagreementPoint(
          state.currentFen,
          ...kibitzerLiveInfos
        ),
        playingEnginesDisagreement: findPvDisagreementPoint(
          state.currentFen,
          ...playingEnginesLiveInfos
        ),
        activeKibitzersJson: JSON.stringify(activeKibitzers),
      };
    })
  );
  const activeKibitzers = JSON.parse(activeKibitzersJson) as EngineColor[];

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
                  <EnginePV
                    pvDisagreementPoint={playingEnginesDisagreement}
                    color={color}
                  />
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
                  <EnginePV
                    pvDisagreementPoint={kibitzerDisagreement}
                    color={color}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
