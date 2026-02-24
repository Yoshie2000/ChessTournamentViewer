import { useMemo, useState } from "react";
import { EngineLogo } from "./EngineLogo";
import { EnginePV } from "./EnginePV";
import { EngineStats } from "./EngineStats";
import type { EngineWindowProps } from "./EngineWindow";
import { findPvDisagreementPoint } from "../utils";
import "./EngineWindowMobile.css";

const TABS = ["Engines", "Engine PVs", "Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindowMobile({ fen, liveInfos }: EngineWindowProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Engines");

  const activeKibitzers = (["green", "blue", "red"] as const).filter(
    (color) => !!liveInfos[color].liveInfo
  );

  const playingEnginesDisagreement = useMemo(() => {
    const playingLiveInfos = PLAYING_ENGINES.map(
      (color) => liveInfos[color].liveInfo
    );
    return findPvDisagreementPoint(fen, ...playingLiveInfos);
  }, [fen, JSON.stringify(activeKibitzers)]);

  const kibitzerDisagreement = useMemo(() => {
    const kibitzerLiveInfos = activeKibitzers.map(
      (color) => liveInfos[color].liveInfo
    );
    return findPvDisagreementPoint(fen, ...kibitzerLiveInfos);
  }, [fen, JSON.stringify(activeKibitzers)]);

  const headerEngines = activeTab.includes("Engine")
    ? PLAYING_ENGINES
    : activeKibitzers;

  const firstColumn = activeTab === "Engines" || activeTab === "Kibitzers";

  return (
    <div className="engineWindowMobile">
      <div className="engineTabs">
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
                    fen={fen}
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
                    fen={fen}
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
