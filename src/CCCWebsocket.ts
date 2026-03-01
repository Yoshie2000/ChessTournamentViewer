import type { CCCMessage } from "./types";

export interface TournamentWebSocket {
  connect: (onMessage: (message: CCCMessage) => void) => void;
  disconnect: () => void;
  send: (msg: unknown) => void;
}

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  private ws: WebSocket | null = null;

  connect(onMessage: (message: CCCMessage) => void) {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.ws.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (let msg of messages) {
        if (msg.type === "eventUpdate") {
          msg.tournamentDetails.hasGamePairs = true;
          msg.tournamentDetails.isRoundRobin = true;
        }

        onMessage(msg);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.connect(onMessage), 1000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    this.ws?.close();
  }

  send(msg: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}
