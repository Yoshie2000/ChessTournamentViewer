import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { EngineCard } from "./EngineCard";
import "./EngineWindow.css";
import { EngineWindowMobile } from "./EngineWindowMobile";
import { EngineLogo } from "./EngineLogo";
import { EngineStats } from "./EngineStats";
import { EnginePV } from "./EnginePV";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { useClocks } from "../../hooks/useClocks";
import type { EngineColor } from "../../LiveInfo";
import { shallow } from "zustand/shallow";
import { useInterval } from "../../hooks/useInterval";

const TABS = ["Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindow() {
  useClocks();

  const [activeKibitzers, setActiveKibitzers] = useState<
    ("red" | "green" | "blue")[]
  >([]);

  useInterval((state) => {
    const liveInfos = state.liveInfos;

    const activeKibitzers = (["green", "blue", "red"] as const).filter(
      (color) => !!liveInfos[color].liveInfo
    );

    setActiveKibitzers((previous) => {
      if (shallow(activeKibitzers, previous)) return previous;
      return activeKibitzers;
    });
  });

  const [activeTab, setActiveTab] = useState<Tab>("Kibitzers");

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--num-kibitzer-cards",
      String(activeKibitzers.length)
    );
  }, [activeKibitzers.length]);

  // MOBILE FALLBACK: Render a different component
  const isMobile = useMediaQuery({ maxWidth: 1400 });
  if (isMobile) return <EngineWindowMobile activeKibitzers={activeKibitzers} />;

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
                  <KibitzerTableHeader color={color} />
                </th>
              ))}
            </tr>
          </thead>

          {activeTab === "Kibitzers" && (
            <EngineStats colors={activeKibitzers} />
          )}

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

  return (
    <div className="engineWindow">
      <EngineCard color="black" />
      <EngineCard color="white" />
      {kibitzerWindow}
    </div>
  );
}

export function KibitzerTableHeader({ color }: { color: EngineColor }) {
  const engineInfo = useLiveInfo((state) => state.liveInfos[color].engineInfo);

  return (
    <span className="engineHeader">
      <EngineLogo engine={engineInfo} key={color} />
      <span className="engineName" title={engineInfo.name}>
        {engineInfo.name}
      </span>
    </span>
  );
}
