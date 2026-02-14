import io from "socket.io-client";
import type { TournamentWebSocket } from "./CCCWebsocket";
import type { CCCMessage } from "./types";
import { Chess960 } from "./chess.js/chess";

const TCEC_SOCKET_URL = "https://tcec-chess.com";
const TCEC_ROOM = "room1";
const TCEC_SOCKET_REFRESH_MS = 4_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export class TCECSocket implements TournamentWebSocket {
  private socket: SocketIOClient.Socket | null = null;
  private manualClose = false;
  private syncTimer: number | null = null;
  private refreshTimer: number | null = null;
  private onPgn: null | ((payload: Record<string, unknown>) => void) = null;
  private onLiveLog: null | ((payload: Record<string, unknown>) => void) = null;

  send(_: unknown) {}

  connect(onMessage: (message: CCCMessage) => void) {
    this.onPgn = (e: any) => {
      if (!e.Headers || !e.Moves || e.Moves.length < 2) return;

      onMessage({
        type: "eventUpdate",
        tournamentDetails: {
          engines: [
            {
              authors: "",
              config: { command: "", options: {}, timemargin: 0 },
              country: "",
              elo: "",
              facts: "",
              flag: "",
              id: "",
              imageUrl: "",
              name: e.Headers.White,
              perf: "",
              points: "",
              rating: "",
              updatedAt: "",
              version: "",
              website: "",
              year: "",
            },
            {
              authors: "",
              config: { command: "", options: {}, timemargin: 0 },
              country: "",
              elo: "",
              facts: "",
              flag: "",
              id: "",
              imageUrl: "",
              name: e.Headers.Black,
              perf: "",
              points: "",
              rating: "",
              updatedAt: "",
              version: "",
              website: "",
              year: "",
            },
          ],
          name: e.Headers.Event,
          schedule: { future: [], past: [], present: undefined },
          tc: {
            init: Number(e.Headers.TimeControl.split("+")[0]),
            incr: Number(e.Headers.TimeControl.split("+")[1]),
          },
          tNr: e.Headers.Event,
        },
      });

      const game = new Chess960();
      game.load(e.Moves.at(-2).fen);
      game.move(e.Moves.at(-1).m);

      game.setHeader("White", e.Headers.White);
      game.setHeader("Black", e.Headers.Black);

      onMessage({
        type: "gameUpdate",
        gameDetails: {
          gameNr: e.Headers.Round,
          live: true,
          opening: "",
          pgn: game.pgn(),
        },
      });
    };
    this.onLiveLog = (e: any) => {
      const data: string[] = e.data.split(" ");

      onMessage({
        type: "liveInfo",
        info: {
          color: "",
          depth: data[data.indexOf("depth") + 1],
          hashfull: data[data.indexOf("hashfull") + 1],
          multipv: data[data.indexOf("multipv") + 1],
          name: "",
          nodes: data[data.indexOf("nodes") + 1],
          ply: 1,
          pv: "",
          score: data[data.indexOf("score") + 2],
          seldepth: data[data.indexOf("seldepth") + 1],
          speed: data[data.indexOf("nps") + 1],
          tbhits: data[data.indexOf("tbhits") + 1],
          time: data[data.indexOf("time") + 1],
        },
      });

      onMessage({
        type: "clocks",
        binc: "0",
        btime: "0",
        winc: "0",
        wtime: "0",
      });
    };

    this.socket = io.connect(TCEC_SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      if (this.manualClose) {
        return;
      }

      this.socket?.emit("room", TCEC_ROOM);
      this.socket?.emit("room", "roomall");
      this.socket?.emit("schedule", "d");
      this.socket?.emit("tournament", "d");
      this.socket?.emit("getusers", "d");
      this.requestSocketSnapshot();
      this.scheduleSocketRefresh();
    });

    this.socket.on("pgn", (rawPayload: unknown) => {
      const payload = asRecord(rawPayload);
      if (!payload) {
        return;
      }

      this.onPgn?.(payload);
    });

    this.socket.on("htmlread", (rawPayload: unknown) => {
      const payload = asRecord(rawPayload);
      if (!payload) {
        return;
      }

      this.onLiveLog?.(payload);
    });
  }

  private scheduleSocketRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
    }

    this.refreshTimer = window.setInterval(() => {
      this.requestSocketSnapshot();
    }, TCEC_SOCKET_REFRESH_MS);
  }

  private requestSocketSnapshot(): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("refreshdata", "d");
    this.socket.emit("pgn", "d");
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.syncTimer !== null) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.socket?.close();
  }
}
