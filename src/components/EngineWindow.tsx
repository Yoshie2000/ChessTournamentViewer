import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { EngineCard } from "./EngineCard";
import "./EngineWindow.css";
import { EngineWindowMobile } from "./EngineWindowMobile";
import { findPvDisagreementPoint } from "../utils";
import { EngineLogo } from "./EngineLogo";
import { EngineStats } from "./EngineStats";
import { EnginePV } from "./EnginePV";
import { useLiveInfo } from "../context/LiveInfoContext";
import { useClocks } from "../hooks/useClocks";
import type { EngineColor } from "../LiveInfo";
import { useShallow } from "zustand/shallow";

const TABS = ["Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindow() {
  useClocks();

  const { kibitzerDisagreement, activeKibitzersJson } = useLiveInfo(
    useShallow((state) => {
      const liveInfos = state.liveInfos;

      const activeKibitzers = (["green", "blue", "red"] as const).filter(
        (color) => !!liveInfos[color].liveInfo
      );

      const kibitzerLiveInfos = activeKibitzers.map(
        (color) => liveInfos[color].liveInfo
      );
      return {
        kibitzerDisagreement: findPvDisagreementPoint(
          state.game.fenAt(state.currentMoveNumber),
          ...kibitzerLiveInfos
        ),
        activeKibitzersJson: JSON.stringify(activeKibitzers),
      };
    })
  );
  const activeKibitzers = JSON.parse(activeKibitzersJson) as EngineColor[];

  const { liveInfos } = useLiveInfo.getState();
  const [activeTab, setActiveTab] = useState<Tab>("Kibitzers");

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--num-kibitzer-cards",
      String(activeKibitzers.length)
    );
  }, [activeKibitzers.length]);

  // MOBILE FALLBACK: Render a different component
  const isMobile = useMediaQuery({ maxWidth: 1400 });
  if (isMobile) return <EngineWindowMobile />;

  const headerEngines = activeTab.includes("Engine")
    ? PLAYING_ENGINES
    : activeKibitzers;

  const firstColumn = activeTab === "Kibitzers";

  const kibitzerWindow =
    activeKibitzers.length === 0 ? null : activeKibitzers.length === 1 ? (
      <EngineCard color={activeKibitzers[0]} />
    ) : (
      <div className="kibitzerWindow">
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
                    <span
                      className="engineName"
                      title={liveInfos[color].engineInfo.name}
                    >
                      {liveInfos[color].engineInfo.name}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>

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

  return (
    <div className="engineWindow">
      <EngineCard color="black" opponentColor="white" />
      <EngineCard color="white" opponentColor="black" />
      {kibitzerWindow}
    </div>
  );
}
