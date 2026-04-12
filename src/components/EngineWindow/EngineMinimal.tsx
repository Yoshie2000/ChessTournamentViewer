import { memo, useState } from "react";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { type EngineColor } from "../../LiveInfo";
import { formatTime } from "./EngineCard";
import { EngineLogo } from "./EngineLogo";
import "./EngineMinimal.css";
import { SkeletonBlock, SkeletonText } from "../Loading";
import { useInterval } from "../../hooks/useInterval";
import { MdInfoOutline } from "react-icons/md";
import { Tooltip } from "antd";

type EngineCardProps = { color: EngineColor; className?: string };

const EngineMinimal = memo(({ color, className }: EngineCardProps) => {
  const engine = useLiveInfo((state) => state.liveEngineData[color].engineInfo);

  const [score, setScore] = useState<string>();
  const [time, setTime] = useState<number>(1);

  useInterval((state) => {
    const wtime = state.liveInfos.white.liveInfo?.info.timeLeft;
    const btime = state.liveInfos.black.liveInfo?.info.timeLeft;
    setTime(
      Number(color === "white" ? wtime : color === "black" ? btime : "1") || 1
    );
    setScore(state.liveInfos[color].liveInfo?.info.score);
  });

  const loading = !score || !engine || !time;

  const name = engine.name ? engine.name : color;
  const version = engine.version || engine.config.version;
  const optionNames = Object.keys(engine.config.options);

  return (
    <div
      className={`engineMinimal ${loading ? "loading" : ""} ${className ?? ""}`}
    >
      <div className="engineInfoHeader">
        {engine ? (
          <EngineLogo engine={engine} size={32} />
        ) : (
          <SkeletonBlock width={32} height={32} style={{ margin: 6 }} />
        )}

        <div className="engineDetails">
          <div className="engineDetailsRow">
            <div className="engineName">{name}</div>
            <Tooltip
              color={"#212121"}
              title={
                <div className="engineOptionsTooltip">
                  {optionNames.map((option) => (
                    <div>
                      {option}: {engine.config.options[option]}
                    </div>
                  ))}
                </div>
              }
            >
              <MdInfoOutline className="engineInfoIcon" />
            </Tooltip>
          </div>
          <div className="engineDetailsRow engineVersion" title={version}>
            {version}
          </div>
        </div>

        <div className="engineOutput">
          <div className="engineTime">
            {loading ? <SkeletonText width="80px" /> : formatTime(time)}
          </div>
          <div> {loading ? <SkeletonText width="40px" /> : score}</div>
        </div>
      </div>
    </div>
  );
});

export { EngineMinimal };
