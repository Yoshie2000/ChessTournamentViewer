import type {
  CCCLiveInfo,
  CCCEventsListUpdate,
  CCCMessage,
  CCCGameUpdate,
} from "./types";

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

  private eventNr: string | undefined = undefined;

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

    this.socket.onmessage = async (e) => {
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

      const eventUpdate = messages.find(
        (message) => message.type === "eventUpdate"
      );
      if (eventUpdate) {
        this.eventNr = eventUpdate.tournamentDetails.tNr;
      }

      const gameUpdate = messages.find(
        (message) => message.type === "gameUpdate"
      );
      if (gameUpdate) {
        const gameNr = Number(gameUpdate.gameDetails.gameNr);
        const isReverse = gameNr % 2 == 1;
        if (isReverse) {
          const pgn = await this.fetchPgn(this.eventNr ?? "", String(gameNr - 1));
          gameUpdate.gameDetails.reversePgn = pgn;
        }
      }

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

  fetchPgn(eventNr: string, gameNr: string) {
    return new Promise<string>((resolve, reject) => {
      const tempSocket = new WebSocket(this.url);

      tempSocket.onopen = () => {
        tempSocket.send(
          JSON.stringify({ type: "requestEvent", eventNr, gameNr })
        );
      };

      tempSocket.onmessage = (e) => {
        const messages = JSON.parse(e.data) as CCCMessage[];
        const found = messages.find((m) => m.type === "gameUpdate") as
          | CCCGameUpdate
          | undefined;

        if (found) {
          tempSocket.close();
          resolve(found.gameDetails.pgn);
        }
      };

      tempSocket.onerror = () => {
        tempSocket.close();
        reject();
      };
    });
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
