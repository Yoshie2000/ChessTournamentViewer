import { MdOutlineClose } from "react-icons/md";
import "./Crosstable.css";
import { useEventStore } from "../../context/EventContext";
import { memo } from "react";
import { usePopup } from "../../context/PopupContext";
import { EngineLogo } from "../EngineWindow/EngineLogo";
import { Button } from "@douyinfe/semi-ui";
import H2hStats from "./H2hStats";

export const Crosstable = memo(() => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const engines = useEventStore((state) => state.engines) ?? [];

  const setPopupState = usePopup((state) => state.setPopupState);

  if (!activeEvent) return null;

  const allGames = [
    ...activeEvent.tournamentDetails.schedule.past,
    ...(activeEvent.tournamentDetails.schedule.present
      ? [activeEvent.tournamentDetails.schedule.present]
      : []),
    ...activeEvent.tournamentDetails.schedule.future,
  ];

  const crosstableClass = engines.length === 2 ? "twoEngines" : "";

  return (
    <table className={`crosstable ${crosstableClass}`}>
      <tbody>
        <tr>
          <td>
            <Button
              className="closeButton"
              onClick={() => setPopupState("none")}
              title="Close"
            >
              <MdOutlineClose />
            </Button>
          </td>
          {engines.map((engine, i) => (
            <td key={engine.id}>
              #{i + 1}. {engine.name}
            </td>
          ))}
        </tr>
        {engines.map((engine, i) => (
          <tr key={engine.id}>
            <td>
              <EngineLogo engine={engine} />
              <p className="engineName">
                #{i + 1}. {engine.name}
              </p>
              <p className="engineStats">
                {engine.points} / {engine.playedGames} ({engine.perf}%)
              </p>
            </td>
            {engines.map((engine2) => {
              if (engine.id === engine2.id) {
                return <td key={engine2.id}>-</td>;
              }
              return (
                <td key={engine2.id}>
                  <H2hStats
                    engine={engine}
                    engine2={engine2}
                    allGames={allGames}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
});
