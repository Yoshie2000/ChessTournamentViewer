import type { CCCMessage } from "./types";

export interface TournamentWebSocket {
  connect: (onMessage: (message: CCCMessage) => void) => void;
  setHandler: (onMessage: (message: CCCMessage) => void) => void;

  disconnect: () => void;
  send: (msg: unknown) => void;
  ws: WebSocket | null;
}

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  ws: WebSocket | null = new WebSocket(this.url);

  private cb: (message: CCCMessage) => void = () => {};

  connect(onMessage: (message: CCCMessage) => void) {
    if (this.ws !== null) {
      return;
    }

    this.cb = onMessage;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.ws.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) {
        if (msg.type === "eventUpdate") {
          msg.tournamentDetails.hasGamePairs = true;
          msg.tournamentDetails.isRoundRobin = true;
        }

        this.cb(msg);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
    };

    this.ws.onerror = () => {
      // this.ws?.close();
      console.log("on eerror");
    };
  }

  setHandler(onMessage: (message: CCCMessage) => void) {
    this.cb = onMessage;

    if (this.ws === null) {
      console.log(`
          _DEV delete this log later
          should never reach this clause
      `);
      return;
    }

    this.ws.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.ws.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) {
        this.cb(msg);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
    };

    this.ws.onerror = () => {
      // this.ws?.close();
      console.log("on eerror");
    };

    this.ws.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) this.cb(msg);
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
