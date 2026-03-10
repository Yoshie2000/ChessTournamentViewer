import type { CCCLiveInfo, CCCMessage } from "./types";

export interface TournamentWebSocket {
  connect: (onMessage: (message: CCCMessage) => void) => void;
  setHandler: (onMessage: (message: CCCMessage) => void) => void;

  isConnected: () => boolean;

  disconnect: () => void;
  send: (msg: unknown) => void;
}

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  private socket: WebSocket | null = null;

  private callback: (message: CCCMessage) => void = () => {};

  connect(onMessage: (message: CCCMessage) => void) {
    if (this.isConnected()) {
      return;
    }

    this.callback = onMessage;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.send({ type: "requestEvent" });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.socket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];

      const lastLiveInfoIdx = messages.findLastIndex(
        (message) => message.type === "liveInfo"
      );
      const newMoveIdx = messages.findLastIndex(
        (message) => message.type === "newMove"
      );
      const isLiveGame = messages.find(
        (message) => message.type === "gameUpdate" && message.gameDetails.live
      );

      const filteredMessages = messages
        // If there are multiple liveInfos for the same ply, ignore all but the last one
        .filter(
          (message, idx) =>
            lastLiveInfoIdx === -1 ||
            message.type !== "liveInfo" ||
            message.info.ply !==
              (messages[lastLiveInfoIdx] as CCCLiveInfo).info.ply ||
            idx === lastLiveInfoIdx
        )
        // Ignore liveInfo updates in the same render cycle as a new move
        .filter(
          (message) =>
            isLiveGame || newMoveIdx === -1 || message.type !== "liveInfo"
        );

      for (const msg of filteredMessages) {
        if (msg.type === "eventUpdate") {
          msg.tournamentDetails.hasGamePairs = true;
          msg.tournamentDetails.isRoundRobin = true;
        }

        this.callback(msg);
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
    return (
      !!this.socket &&
      this.socket.readyState !== this.socket.CLOSING &&
      this.socket.readyState !== this.socket.CLOSED &&
      this.socket.readyState !== undefined
    );
  }

  setHandler(onMessage: (message: CCCMessage) => void) {
    this.callback = onMessage;
  }

  disconnect() {
    this.socket?.close();
  }

  send(msg: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}
