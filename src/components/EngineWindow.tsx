import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { EngineCard } from "./EngineCard";
import "./EngineWindow.css";
import { EngineWindowMobile } from "./EngineWindowMobile";
import { findPvDisagreementPoint } from "../utils";
import { EngineLogo } from "./EngineLogo";
import { EngineStats } from "./EngineStats";
import { EnginePV } from "./EnginePV";
import { useLiveInfo } from "../context/LiveInfoContext";

type EngineWindowProps = {
  clocks?: { wtime?: string; btime?: string };
};

const TABS = ["Kibitzers", "Kibitzer PVs"] as const;
type Tab = (typeof TABS)[number];

const PLAYING_ENGINES = ["white", "black"] as const;

export function EngineWindow({ clocks }: EngineWindowProps) {
  const liveInfos = useLiveInfo((state) => state.liveInfos);
  const fen = useLiveInfo((state) => state.currentFen);

  const [activeTab, setActiveTab] = useState<Tab>("Kibitzers");
  const activeKibitzers = (["green", "blue", "red"] as const).filter(
    (color) => !!liveInfos[color].liveInfo
  );
  const kibitzerDisagreement = useMemo(() => {
    const kibitzerLiveInfos = activeKibitzers.map(
      (color) => liveInfos[color].liveInfo
    );
    return findPvDisagreementPoint(fen, ...kibitzerLiveInfos);
  }, [fen, JSON.stringify(activeKibitzers)]);
  const [wtime, btime] = useMemo(() => {
    const wtime = Number(clocks?.wtime ?? 0);
    const btime = Number(clocks?.btime ?? 0);
    return [wtime, btime];
  }, [clocks?.wtime, clocks?.btime]);

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
      <EngineCard
        color={activeKibitzers[0]}
        time={1}
        fen={fen}
      />
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
                <th>
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

  return (
    <div className="engineWindow">
      <EngineCard
        color="black"
        opponentColor="white"
        time={btime}
        fen={fen}
      />
      <EngineCard
        color="white"
        opponentColor="black"
        time={wtime}
        fen={fen}
      />
      {kibitzerWindow}
    </div>
  );
}
