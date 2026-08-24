import { useEventStore } from "@/context/EventContext";
import { useLiveInfo } from "@/context/LiveInfoContext";
import { toTitleCaseTCEC } from "@/utils";
import { Button, Spin } from "@douyinfe/semi-ui";
import { useState } from "react";
import { LuDownload } from "react-icons/lu";

export default function LogDownloadButton() {
  const [loading, setLoading] = useState(false);

  const activeProvider = useEventStore((state) => state.activeProvider);
  const activeGame = useEventStore((state) => state.activeGame);
  const isEventRunning = useEventStore(
    (state) => state.activeEvent?.tournamentDetails.schedule.present
  );

  const game = useLiveInfo((state) => state.game);

  const pgnHeaders = game.getHeaders();
  const termination =
    activeGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  if (activeProvider === "ccc" && termination && result && result !== "*") {
    return (
      <a
        href={`https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${activeGame?.gameDetails.gameNr}.log`}
        target="_blank"
      >
        <Button title="Download UCI logs">
          <LuDownload />
        </Button>
      </a>
    );
  }

  if (activeProvider === "tcec") {
    // For live events, pull the data from https://tcec-chess.com/live.log
    if (isEventRunning) {
      return (
        <Button
          title="Download UCI logs"
          disabled={loading}
          onClick={() => {
            setLoading(true);

            fetch("https://ctv.yoshie2000.de/tcec/live.log")
              .then((response) => response.text())
              .then((text) => text.split("\n"))
              .then((lines) => {
                const gameIndex = Number(activeGame?.gameDetails.gameNr);

                // Find starting and ending window (not exact)
                let startIndex = lines.findIndex((line) =>
                  line.includes(`Started game ${gameIndex}`)
                );
                let endIndex = lines.findIndex((line) =>
                  line.includes(`Started game ${gameIndex + 1}`)
                );
                if (endIndex === -1) endIndex = lines.length;

                // Walk backwards to find end of previous game
                let found = false;
                for (let i = startIndex; i >= 0; i--) {
                  if (lines[i] === "Finished match") {
                    startIndex = i + 1;
                    found = true;
                    break;
                  }
                }
                if (!found) startIndex = 0;

                // Walk backwards to find end of current game
                found = false;
                for (let i = endIndex; i > startIndex; i--) {
                  if (lines[i] === "Finished match") {
                    endIndex = i + 1;
                    found = true;
                    break;
                  }
                }
                if (!found) endIndex = lines.length;

                // Auto-download as blob URL
                const uciLog = lines.slice(startIndex, endIndex).join("\n");
                const blob = new Blob([uciLog], {
                  type: "text/plain;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = `${useEventStore.getState().activeEvent?.tournamentDetails.tNr}_${gameIndex}.log`;
                a.click();

                URL.revokeObjectURL(url);

                setLoading(false);
              });
          }}
        >
          {loading ? <Spin /> : <LuDownload />}
        </Button>
      );
    }
    // For past events, link to the compressed archive
    else {
      return (
        <a
          href={`https://tcec-chess.com/loglive/archive/${toTitleCaseTCEC(useEventStore.getState().activeEvent?.tournamentDetails.tNr ?? "")}.log.xz`}
          target="_blank"
        >
          <Button title="Download UCI logs">
            <LuDownload />
          </Button>
        </a>
      );
    }
  }
}
