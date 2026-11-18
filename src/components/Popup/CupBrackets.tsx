import { useEventStore } from "@/context/EventContext";
import "./CupBrackets.css";
import { MdOutlineClose } from "react-icons/md";
import { Button } from "@douyinfe/semi-ui";
import { usePopup } from "@/context/PopupContext";

const margin = (layer: number) => ((Math.pow(2, layer) - 1) * (54 + 16)) / 2;
const marginForThird = (layer: number) =>
  ((Math.pow(2, layer - 2) - 1) * (54 + 16)) / 2;
const marginForFinal = (layer: number) =>
  ((Math.pow(2, layer - 0.25) - 1) * (54 + 16)) / 2;

export default function CupBrackets() {
  const cupMatches = useEventStore(
    (state) => state.activeEvent?.tournamentDetails.cupMatches
  );

  const setPopupState = usePopup((state) => state.setPopupState);

  return (
    <div className="cupBracketsContainer">
      <Button
        className="closeButton"
        onClick={() => setPopupState("none")}
        title="Close"
      >
        <MdOutlineClose />
      </Button>

      <div className="cupBrackets">
        {cupMatches?.map((cupEvent, idx) => (
          <div className="cupColumn" key={idx}>
            {cupEvent.map((cupMatch, matchIdx) => {
              const winner =
                cupMatch.points0 && cupMatch.points1 && !cupMatch.live
                  ? cupMatch.points0 > cupMatch.points1
                    ? 0
                    : 1
                  : undefined;

              const marginString = cupMatch.final
                ? `${marginForFinal(idx)}px 0 0 0`
                : cupMatch.matchForThird
                  ? `${marginForThird(idx)}px 0 0 0`
                  : `${margin(idx)}px 0`;

              return (
                <div
                  className={`cupMatch ${cupMatch.live ? "live" : ""}`}
                  style={{ margin: marginString }}
                  key={matchIdx}
                >
                  <div
                    className={`cupEngine0Name ${winner === 0 ? "winner" : winner === 1 ? "loser" : ""}`}
                  >
                    {cupMatch.engine0?.name ?? "TBD"}
                  </div>
                  <div
                    className={`cupEngine0Points ${winner === 0 ? "winner" : winner === 1 ? "loser" : ""}`}
                  >
                    {cupMatch.points0 ?? "-"}
                  </div>
                  <div
                    className={`cupEngine1Name ${winner === 0 ? "loser" : winner === 1 ? "winner" : ""}`}
                  >
                    {cupMatch.engine1?.name ?? "TBD"}
                  </div>
                  <div
                    className={`cupEngine1Points ${winner === 0 ? "loser" : winner === 1 ? "winner" : ""}`}
                  >
                    {cupMatch.points1 ?? "-"}
                  </div>

                  {idx !== cupMatches.length - 1 && (
                    <>
                      <ConnectingLine
                        idx={idx}
                        matchIdx={matchIdx}
                        winner={winner}
                        numColumns={cupMatches.length}
                        fakeLines={false}
                      />
                      {idx === cupMatches.length - 2 &&
                        winner === undefined && (
                          <ConnectingLine
                            idx={idx}
                            matchIdx={matchIdx}
                            winner={winner}
                            numColumns={cupMatches.length}
                            fakeLines={true}
                          />
                        )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type ConnectingLineProps = {
  idx: number;
  matchIdx: number;
  winner: 0 | 1 | undefined;
  numColumns: number;
  fakeLines: boolean;
};

function ConnectingLine({
  idx,
  matchIdx,
  winner,
  numColumns,
  fakeLines,
}: ConnectingLineProps) {
  const lastLayer = idx === numColumns - 2;
  const bottomBracket = matchIdx % 2 === 1;
  const yDiff = lastLayer
    ? marginForFinal(idx + 1) - margin(idx)
    : margin(idx + 1) - margin(idx);

  const p0OffsetY = lastLayer
    ? winner === 0 && bottomBracket
      ? marginForThird(idx + 1) + 54 + 18
      : (winner === 1 && !bottomBracket) || fakeLines
        ? marginForThird(idx + 1) + 54 + 18
        : 0
    : 0;
  const p1OffsetY = lastLayer
    ? winner === 1 && bottomBracket
      ? marginForThird(idx + 1) + 54 + 18
      : (winner === 0 && !bottomBracket) || fakeLines
        ? marginForThird(idx + 1) + 54 + 18
        : 0
    : 0;

  const p0OffsetX = lastLayer ? (winner === 0 ? 6 : -6) : 0;
  const p1OffsetX = lastLayer ? (winner === 0 ? -6 : 6) : 0;

  const p0Color = !lastLayer || winner === 0 ? "#434343" : "#323232";
  const p1Color = !lastLayer || winner === 1 ? "#434343" : "#323232";

  return (
    <>
      {(winner === 0 || winner === undefined || lastLayer) &&
        matchIdx % 2 === 0 && (
          <>
            <div
              style={{
                background: p0Color,
                width: `${24 + p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: `${-25 - p0OffsetX}px`,
                top: "13px",
              }}
            ></div>
            <div
              style={{
                background: p0Color,
                width: `${24 - p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: "-49px",
                top: `${13 + yDiff + p0OffsetY}px`,
              }}
            ></div>
            <div
              style={{
                background: p0Color,
                width: "4px",
                height: `${4 + yDiff + p0OffsetY}px`,
                position: "absolute",
                right: `${-25 - p0OffsetX}px`,
                top: `13px`,
              }}
            ></div>
          </>
        )}
      {(winner === 1 || winner === undefined || lastLayer) &&
        matchIdx % 2 === 0 && (
          <>
            <div
              style={{
                background: p1Color,
                width: `${24 + p1OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: `${-25 + p0OffsetX}px`,
                top: "35px",
              }}
            ></div>
            <div
              style={{
                background: p1Color,
                width: `${24 + p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: `-49px`,
                top: `${13 + yDiff + p1OffsetY}px`,
              }}
            ></div>
            <div
              style={{
                background: p1Color,
                width: "4px",
                height: `${-18 + yDiff + p1OffsetY}px`,
                position: "absolute",
                right: `${-25 + p0OffsetX}px`,
                top: `35px`,
              }}
            ></div>
          </>
        )}
      {(winner === 0 || winner === undefined || lastLayer) &&
        matchIdx % 2 === 1 && (
          <>
            <div
              style={{
                background: p0Color,
                width: `${24 + p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: `${-25 - p0OffsetX}px`,
                top: "13px",
              }}
            ></div>
            <div
              style={{
                background: p0Color,
                width: `${24 - p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: "-49px",
                top: `${35 - yDiff - p0OffsetY}px`,
              }}
            ></div>
            <div
              style={{
                background: p0Color,
                width: "4px",
                height: `${-18 + yDiff + p0OffsetY}px`,
                position: "absolute",
                right: `${-25 - p0OffsetX}px`,
                top: `${35 - yDiff - p0OffsetY}px`,
              }}
            ></div>
          </>
        )}
      {(winner === 1 || winner === undefined || lastLayer) &&
        matchIdx % 2 === 1 && (
          <>
            <div
              style={{
                background: p1Color,
                width: `${24 + p1OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: `${-25 + p0OffsetX}px`,
                top: "35px",
              }}
            ></div>
            <div
              style={{
                background: p1Color,
                width: `${24 + p0OffsetX}px`,
                height: "4px",
                position: "absolute",
                right: "-49px",
                top: `${35 - yDiff - p1OffsetY}px`,
              }}
            ></div>
            <div
              style={{
                background: p1Color,
                width: "4px",
                height: `${4 + yDiff + p1OffsetY}px`,
                position: "absolute",
                right: `${-25 + p0OffsetX}px`,
                top: `${35 - yDiff - p1OffsetY}px`,
              }}
            ></div>
          </>
        )}
    </>
  );
}
