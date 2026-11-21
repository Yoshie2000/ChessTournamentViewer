import { useEventStore } from "@/context/EventContext";
import { useLiveInfo } from "@/context/LiveInfoContext";
import { toTitleCaseTCEC } from "@/utils";
import { Button, Spin } from "@douyinfe/semi-ui";
import { useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { XzReadableStream } from "xz-decompress";

function downloadLogLines(lines: string[], gameIndex: number) {
  // Auto-download as blob URL
  const uciLog = lines.join("\n");
  const blob = new Blob([uciLog], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${useEventStore.getState().activeEvent?.tournamentDetails.tNr}_${gameIndex}.log`;
  a.click();

  URL.revokeObjectURL(url);
}

async function downloadGameLogs(
  stream: ReadableStream<Uint8Array>,
  gameIndex: number
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let tail = "";

  const buffer: string[] = [];
  let isCurrentGame = false;
  let finished = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = tail + decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    tail = lines.pop()!; // Last element is a partial line, prepend it next turn

    for (const line of lines) {
      if (line.startsWith(`Started game ${gameIndex} `)) isCurrentGame = true;

      // Keep one game in the buffer at a time
      buffer.push(line);
      if (line.startsWith(`Finished`)) {
        if (isCurrentGame) {
          finished = true;
          break;
        }

        buffer.length = 0;
      }
    }

    if (finished) {
      // Abort the rest of the request
      await reader.cancel();
      break;
    }
  }

  downloadLogLines(buffer, gameIndex);
}

export default function LogDownloadButton() {
  const [loading, setLoading] = useState(false);

  const activeProvider = useEventStore((state) => state.activeProvider);
  const activeGame = useEventStore((state) => state.activeGame);
  const isEventRunning = useEventStore(
    (state) => state.activeEvent?.tournamentDetails.schedule.present
  );

  const game = useLiveInfo((state) => state.game);

  const abortControllerRef = useRef(new AbortController());

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
  } else if (activeProvider === "ccc") {
    return null;
  }

  // fallback
  if (activeProvider !== "tcec") {
    return null;
  }

  return (
    <Button
      title="Download UCI logs"
      onClick={async () => {
        try {
          if (loading) {
            // no need for early return; calling .abort() throws an Error
            abortControllerRef.current.abort();
          }

          setLoading(true);
          const gameIndex = Number(activeGame?.gameDetails.gameNr);

          const res = await fetch(
            isEventRunning
              ? // For live events, pull the data from https://tcec-chess.com/live.log
                "https://ctv.yoshie2000.de/tcec/live.log"
              : // For past events, link to the compressed archive
                `https://ctv.yoshie2000.de/tcec/loglive/archive/${toTitleCaseTCEC(useEventStore.getState().activeEvent?.tournamentDetails.tNr ?? "")}.log.xz`,
            { signal: abortControllerRef.current.signal }
          );

          if (!res.ok) {
            throw new Error(`Error ${res.status}`);
          }

          if (!res.body) {
            throw new Error(`Unable to download logs. Response body is null`);
          }

          await downloadGameLogs(
            isEventRunning ? res.body : new XzReadableStream(res.body),
            gameIndex
          );
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // abort error
          } else if (error instanceof Error) {
            console.error(error);
            alert(`Error downloading logs\n${error.message}`);
          } else {
            console.log("Unhandled error");
            console.log(error);
          }
        } finally {
          if (abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
          }
          setLoading(false);
        }
      }}
    >
      {loading ? <Spin /> : <LuDownload />}
    </Button>
  );
}
