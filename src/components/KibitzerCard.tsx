import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LiveEngineDataEntry,
  LiveEngineDataEntryObject,
} from "../LiveInfo";
import "./KibitzerCard.css";
import { EngineLogo } from "./EngineLogo";
import { formatLargeNumber } from "./EngineCard";
import { Board, type BoardHandle } from "./Board";
import { MoveList } from "./MoveList";
import { buildPvGame, findPvDisagreementPoint, normalizePv } from "../utils";
import { Chess960 } from "../chess.js/chess";
import { SkeletonBlock } from "./Loading";

type KibitzerCardProps = { liveInfos: LiveEngineDataEntry; fen: string };

export function KibitzerCard({ liveInfos, fen }: KibitzerCardProps) {
  const activeKibitzers = (["green", "blue", "red"] as const).filter(
    (color) => !!liveInfos[color].liveInfo
  );

  const [activeTab, setActiveTab] = useState<"overview" | "pvs">("overview");

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--num-kibitzer-cards",
      String(activeKibitzers.length)
    );
  }, [activeKibitzers.length]);

  const kibitzerLiveInfos = activeKibitzers.map((color) => liveInfos[color].liveInfo)
  const pvDisagreementPoint = useMemo(() => {
    return findPvDisagreementPoint(fen, ...kibitzerLiveInfos);
  }, [fen, ...kibitzerLiveInfos]);

  return (
    <div className="kibitzerCard">
      <div className="engineTabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={activeTab === "pvs" ? "active" : ""}
          onClick={() => setActiveTab("pvs")}
        >
          PVs
        </button>
      </div>

      <table>
        <thead>
          <tr>
            {activeTab === "overview" && <th className="engineFieldKey"></th>}
            {activeKibitzers.map((color) => (
              <th>
                <span className="engineHeader">
                  {activeTab === "overview" && (
                    <EngineLogo
                      engine={liveInfos[color].engineInfo}
                      key={color}
                    />
                  )}
                  <span>{liveInfos[color].engineInfo.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {activeTab === "overview" && (
          <KibitzerOverview
            activeKibitzers={activeKibitzers}
            liveInfos={liveInfos}
          />
        )}
        {activeTab === "pvs" && (
          <tbody>
            <tr>
              {activeKibitzers.map((color) => (
                <td key={color}>
                  <KibitzerPVs
                    fen={fen}
                    pvDisagreementPoint={pvDisagreementPoint}
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

type KibitzerOverviewProps = {
  activeKibitzers: ("red" | "green" | "blue")[];
  liveInfos: LiveEngineDataEntry;
};

function KibitzerOverview({
  activeKibitzers,
  liveInfos,
}: KibitzerOverviewProps) {
  return (
    <tbody>
      <tr className="borderTop">
        <td className="engineFieldKey">Depth</td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineFieldValue">
            {liveInfos[color].liveInfo?.info.depth} /{" "}
            {liveInfos[color].liveInfo?.info.seldepth}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">Nodes</td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.nodes)}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">NPS</td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.speed)}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">TB Hits</td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineFieldValue">
            {formatLargeNumber(liveInfos[color].liveInfo?.info.tbhits)}
          </td>
        ))}
      </tr>

      <tr>
        <td className="engineFieldKey">Hashfull</td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineFieldValue">
            {liveInfos[color].liveInfo?.info.hashfull}
          </td>
        ))}
      </tr>

      <tr className="borderTop">
        <td className="engineFieldKey"></td>
        {activeKibitzers.map((color) => (
          <td key={color} className="engineEvaluation">
            {liveInfos[color].liveInfo?.info.score}
          </td>
        ))}
      </tr>
    </tbody>
  );
}

type KibitzerPVsProps = {
  liveInfoData: LiveEngineDataEntryObject;
  fen: string;
  pvDisagreementPoint: number;
};

function KibitzerPVs({
  liveInfoData,
  fen,
  pvDisagreementPoint,
}: KibitzerPVsProps) {
  const data = liveInfoData.liveInfo?.info;

  const boardHandle = useRef<BoardHandle>(null);
  const pvMoveNumber = useRef(-1);
  const game = useRef(new Chess960());

  const moves = useMemo(() => {
    if (!data?.color) return undefined;

    pvMoveNumber.current = -1;
    return normalizePv(data.pvSan, data.color, fen);
  }, [data?.pvSan, data?.color, fen]);

  function updateBoard() {
    boardHandle.current?.updateBoard(game.current, pvMoveNumber.current);
  }

  const setPvMoveNumber = useCallback(
    (callback: (previous: number) => number) => {
      pvMoveNumber.current = callback(pvMoveNumber.current);
      updateBoard();
    },
    [moves, fen]
  );

  useEffect(() => {
    if (!fen || !moves) return;

    // Throttle the actual update slightly to not destroy react render times
    const timeout = setTimeout(() => {
      game.current = buildPvGame(fen, moves, -1);
      updateBoard();
    }, 10);

    return () => clearTimeout(timeout);
  }, [moves, boardHandle.current]);

  const moveNumberOffset = new Chess960(fen).moveNumber() - 1;

  if (!moves) {
    return (
      <SkeletonBlock
        width="100%"
        height="calc(100% - 2 * var(--padding))"
        style={{ margin: "var(--padding) var(--padding) var(--padding) 0" }}
      />
    );
  }

  return (
    <div className="engineBoard">
      <Board ref={boardHandle} animated={false} />

      <MoveList
        startFen={fen}
        moves={moves}
        currentMoveNumber={pvMoveNumber.current}
        setCurrentMoveNumber={setPvMoveNumber}
        controllers={false}
        disagreementMoveIndex={
          pvDisagreementPoint !== -1 ? pvDisagreementPoint : undefined
        }
        moveNumberOffset={moveNumberOffset}
      />
    </div>
  );
}
