import type { CCCMessage } from "./types";

export interface TournamentWebSocket {
  connect: (onMessage: (message: CCCMessage) => void) => void;
  setHandler: (onMessage: (message: CCCMessage) => void) => void;

  isConnected: () => boolean;

  disconnect: () => void;
  send: (msg: unknown) => void;
  socket: WebSocket | SocketIOClient.Socket | null;
}

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  socket: WebSocket | null = new WebSocket(this.url);

  private cb: (message: CCCMessage) => void = () => {};

  connect(onMessage: (message: CCCMessage) => void) {
    if (this.socket !== null) {
      return;
    }

    this.cb = onMessage;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.socket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) {
        if (msg.type === "eventUpdate") {
          msg.tournamentDetails.hasGamePairs = true;
          msg.tournamentDetails.isRoundRobin = true;
        }

        this.cb(msg);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
    };

    this.socket.onerror = () => {
      // this.ws?.close();
      console.log("on error");
    };
  }

  isConnected() {
    return !!this.socket && this.socket.readyState !== this.socket.CLOSING && this.socket.readyState !== this.socket.CLOSED && this.socket.readyState !== undefined;
  }

  setHandler(onMessage: (message: CCCMessage) => void) {
    this.cb = onMessage;

    if (this.socket === null) {
      console.log(`
          _DEV delete this log later
          should never reach this clause
      `);
      return;
    }

    this.socket.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.socket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) {
        this.cb(msg);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
    };

    this.socket.onerror = () => {
      // this.ws?.close();
      console.log("on eerror");
    };

    this.socket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      for (const msg of messages) this.cb(msg);
    };
  }

  disconnect() {
    this.socket?.close();
  }

  send(msg: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}
