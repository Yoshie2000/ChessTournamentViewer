import type { CCCLiveInfo, CCCEventsListUpdate, CCCMessage } from "./types";

export interface TournamentWebSocket {
  connect: (
    onMessage: (message: CCCMessage) => void,
    initialEventId?: string,
    initialGameId?: string
  ) => void;
  setHandler: (onMessage: (message: CCCMessage) => void) => void;

  isConnected: () => boolean;

  disconnect: () => void;
  send: (msg: unknown) => void;
  fetchEventList: (onEventList: (msg: CCCEventsListUpdate) => void) => void;
}

const TIMEOUT_RECONNECT_MS = 5000;

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  private socket: WebSocket | null = null;

  private callback: (message: CCCMessage) => void = () => {};

  private timeoutId: number | undefined = undefined;

  connect(
    onMessage: (message: CCCMessage) => void,
    initialEventId?: string,
    initialGameId?: string
  ) {
    if (this.isConnected()) {
      return;
    }

    this.callback = onMessage;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.send({
        type: "requestEvent",
        eventNr: initialEventId,
        gameNr: initialGameId,
      });
      this.send({ type: "requestEventsListUpdate" });
    };

    this.timeoutId = setTimeout(() => {
      this.disconnect();
      this.connect(this.callback, initialEventId, initialGameId);
    }, TIMEOUT_RECONNECT_MS);

    this.socket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];

      const hasGameUpdate = messages.some(
        (message) => message.type === "gameUpdate"
      );
      if (hasGameUpdate) {
        clearTimeout(this.timeoutId);
      }

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
  }

  fetchEventList(onEventList: (msg: CCCEventsListUpdate) => void) {
    const tempSocket = new WebSocket(this.url);

    tempSocket.onopen = () => {
      tempSocket.send(JSON.stringify({ type: "requestEventsListUpdate" }));
    };

    tempSocket.onmessage = (e) => {
      const messages = JSON.parse(e.data) as CCCMessage[];
      const found = messages.find((m) => m.type === "eventsListUpdate") as
        | CCCEventsListUpdate
        | undefined;

      if (found) {
        onEventList(found);
        tempSocket.close();
      }
    };

    tempSocket.onerror = () => tempSocket.close();
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
