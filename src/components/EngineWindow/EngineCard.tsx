import { useMemo, memo, useEffect, useState } from "react";
import "./EngineCard.css";
import { SkeletonBlock, SkeletonText } from "../Loading";
import { MoveList } from "../MoveList";
import { buildPvGame, normalizePv } from "../../utils";
import { Chess, Chess960 } from "../../chess.js/chess";
import { useMediaQuery } from "react-responsive";
import { useKibitzerBoard } from "../../hooks/BoardHook";
import type { EngineColor } from "../../LiveInfo";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { EngineMinimal } from "./EngineMinimal";
import { useInterval } from "../../hooks/useInterval";
import { IoIosArrowDown } from "react-icons/io";
import { loadSettings, saveSettings } from "@/LocalStorage";

type EngineCardProps = { color: EngineColor };

export function formatLargeNumber(value?: string) {
  if (!value) return "-";
  const x = Number(value);
  if (isNaN(x)) return "-";
  if (x >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (x >= 1_000) return (x / 1_000).toFixed(2) + "K";
  return String(x);
}

export function formatTime(time: number) {
  if (time < 0) time = 0;
  const hundreds = String(Math.floor(time / 100) % 10).padEnd(2, "0");
  const seconds = String(Math.floor(time / 1000) % 60).padStart(2, "0");
  const minutes = String(Math.floor(time / (1000 * 60))).padStart(2, "0");
  return `${minutes}:${seconds}.${hundreds}`;
}

const EngineCard = memo(({ color }: EngineCardProps) => {
  const state = useLiveInfo.getState();

  const [fen, setFen] = useState(state.currentFen);
  const [time, setTime] = useState(1);
  const [pvDisagreementPoint, setPvDisagreementPoint] = useState<number>();
  const [_, setDepth] = useState<number>();

  useInterval((state) => {
    setFen(state.currentFen);

    // Live engines are re-rendered if the time changes
    const wtime = state.liveInfos.white.liveInfo?.info.timeLeft;
    const btime = state.liveInfos.black.liveInfo?.info.timeLeft;
    setTime(
      Number(color === "white" ? wtime : color === "black" ? btime : "1") || 1
    );

    // Kibitzers are updated at least on every depth change >= 15, to prevent too frequent updates
    setDepth(
      !["black", "white"].includes(color)
        ? Math.max(
            15,
            Number(state.liveInfos[color].liveInfo?.info.depth || 0) || 0
          )
        : undefined
    );

    setPvDisagreementPoint(state.engineAgreePly.at(state.currentMoveNumber));
  });

  const engine = useLiveInfo((state) => state.liveInfos[color].engineInfo);
  const liveInfo = state.liveInfos[color].liveInfo;

  const data = liveInfo?.info;
  const loading = !data || !engine || !time || !fen;

  const {
    Board,
    currentMoveNumber,
    game,
    setCurrentFen,
    setCurrentMoveNumber,
  } = useKibitzerBoard({ animated: false });

  const moves = useMemo(() => {
    if (loading || !fen || !data?.color) return undefined;

    return normalizePv(data.pvSan || "", data.color, fen);
  }, [loading, data?.pvSan, data?.color, fen]);

  useEffect(() => {
    if (!fen || !moves) return;

    game.current = buildPvGame(fen, moves, -1);
    setCurrentFen(game.current.fen());
    setCurrentMoveNumber(-1);
  }, [moves]);

  const fields = loading
    ? ["Depth", "Nodes", "NPS", "TB Hits", "Hashfull"].map((label) => [
        label,
        null,
      ])
    : [
        ["Depth", `${data.depth}/${data.seldepth ?? "-"}`],
        ["Nodes", formatLargeNumber(data.nodes)],
        ["NPS", formatLargeNumber(data.speed)],
        ["TB Hits", formatLargeNumber(data.tbhits) ?? "-"],
        ["Hashfull", data.hashfull ?? "-"],
      ];

  const isMobile = useMediaQuery({ maxWidth: 1400 });

  const safeFen = fen ?? new Chess().fen();
  const moveNumberOffset = new Chess960(safeFen).moveNumber() - 1;

  const expandedSettingsKey = "expanded-" + color;
  const [isExpanded, setIsExpanded] = useState(
    loadSettings()[expandedSettingsKey] === "true"
  );
  const expandedClass = isExpanded ? "" : "small";

  useEffect(() => {
    saveSettings({ [expandedSettingsKey]: String(isExpanded) });
  }, [isExpanded]);

  return (
    <div className={`engineComponent ${loading ? "loading" : ""}`}>
      <EngineMinimal color={color} />

      <hr />

      <IoIosArrowDown
        className={"collapseToggle " + expandedClass}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      />

      {!isMobile && (
        <div className={"engineRightSection " + expandedClass}>
          {loading && <SkeletonBlock width="100%" />}

          {!loading && moves && (
            <>
              {Board}

              <MoveList
                startFen={safeFen}
                moves={moves}
                currentMoveNumber={currentMoveNumber}
                setCurrentMoveNumber={setCurrentMoveNumber}
                controllers={false}
                disagreementMoveIndex={
                  pvDisagreementPoint !== -1 ? pvDisagreementPoint : undefined
                }
                moveNumberOffset={moveNumberOffset}
              />
            </>
          )}
        </div>
      )}

      {!isMobile && !loading && moves && <hr />}

      <div className="engineInfoTable">
        {fields.map(([label, value]) => (
          <div
            className={"engineField " + label?.replace(" ", "").toLowerCase()}
            key={label}
          >
            {loading ? (
              <SkeletonText width="100%" />
            ) : (
              <>
                <div className="key">{label}</div>
                <div className="value">{value}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export { EngineCard };
