import { useState } from "react";
import { EngineLogo } from "./EngineLogo";
import { EnginePV } from "./EnginePV";
import { EngineStats } from "./EngineStats";
import "./EngineWindowMobile.css";
import { useLiveInfo } from "../context/LiveInfoContext";

const TABS = ["Engines", "Engine PVs", "Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindowMobile() {
  const liveInfos = useLiveInfo((state) => state.liveInfos);

  const [activeTab, setActiveTab] = useState<Tab>("Engines");

  const activeKibitzers = (["green", "blue", "red"] as const).filter(
    (color) => !!liveInfos[color].liveInfo
  );

  const playingEnginesDisagreement = useLiveInfo((state) => state.engineAgreePly.at(state.currentMoveNumber));
  const kibitzerDisagreement = useLiveInfo((state) => state.kibitzerAgreePly.at(state.currentMoveNumber));

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
                <span className="engineHeader">
                  <EngineLogo
                    engine={liveInfos[color].engineInfo}
                    key={color}
                  />
                  <span>{liveInfos[color].engineInfo.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {activeTab === "Engines" && (
          <EngineStats colors={PLAYING_ENGINES} liveInfos={liveInfos} />
        )}

        {activeTab === "Engine PVs" && (
          <tbody>
            <tr>
              {PLAYING_ENGINES.map((color) => (
                <td key={color}>
                  <EnginePV
                    pvDisagreementPoint={playingEnginesDisagreement}
                    liveInfoData={liveInfos[color]}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        )}

        {activeTab === "Kibitzers" && (
          <EngineStats colors={activeKibitzers} liveInfos={liveInfos} />
        )}

        {activeTab === "Kibitzer PVs" && (
          <tbody>
            <tr>
              {activeKibitzers.map((color) => (
                <td key={color}>
                  <EnginePV
                    pvDisagreementPoint={kibitzerDisagreement}
                    liveInfoData={liveInfos[color]}
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
