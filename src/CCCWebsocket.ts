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
  fetchReverseFor: (
    gameNumber: number
  ) => Promise<{ pgn: string; reverseGameNumber: number } | null>;
}

const TIMEOUT_RECONNECT_MS = 5000;

export class CCCWebSocket implements TournamentWebSocket {
  private url: string = "wss://ccc-api.gcp-prod.chess.com/ws";
  private socket: WebSocket | null = null;

  private callback: (message: CCCMessage) => void = () => {};

  private timeoutId: number | undefined = undefined;
  private eventNr: string | undefined = undefined;
  /**
   * **The starting game number of the current CCC event**
   *
   * CCC's game numbers now persist across events, so the first game
   * of a new event can start at an arbitrary number (e.g. `19010/19011`)
   *
   * This is needed to correctly calculate the reverse game number,
   * as the parity `even/odd` of the starting number determines
   * whether the reverse game is `gameNr + 1` or `gameNr - 1`
   */
  private firstGameNumber: number | undefined = undefined;

  private tempSocket: WebSocket | null = null;

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
        // TODO i should add a comment about why this bs needed later
        this.firstGameNumber =
          Number(eventUpdate.tournamentDetails?.schedule.past?.[0].gameNr) ||
          Number(eventUpdate.tournamentDetails.schedule.present?.gameNr) ||
          undefined;
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

  async fetchReverseFor(gameNumber: number) {
    if (this.firstGameNumber === undefined) {
      return null;
    }

    const isFirstGameNumberEven = this.firstGameNumber % 2 === 0;
    const isCurrentGameNumberEven = gameNumber % 2 === 0;

    const direction = isFirstGameNumberEven ? 1 : -1;
    const reverseGameNumber =
      gameNumber + (isCurrentGameNumberEven ? direction : -direction);

    try {
      const pgn = await this.fetchPgn(
        this.eventNr ?? "",
        String(reverseGameNumber)
      );

      return { pgn, reverseGameNumber };
    } catch {
      return null;
    }
  }

  fetchPgn(eventNr: string, gameNr: string) {
    return new Promise<string>((resolve, reject) => {
      if (this.tempSocket) {
        this.tempSocket.close();
        this.tempSocket = null;
      }

      this.tempSocket = new WebSocket(this.url);

      this.tempSocket.onopen = () => {
        if (!this.tempSocket) {
          reject();
          return;
        }

        this.tempSocket.send(
          JSON.stringify({ type: "requestEvent", eventNr, gameNr })
        );
      };

      this.tempSocket.onmessage = (e) => {
        if (!this.tempSocket) {
          reject();
          return;
        }

        const messages = JSON.parse(e.data) as CCCMessage[];
        const found = messages.find(this.checkMsgIsGameUpdate);

        if (found) {
          this.tempSocket.close();
          resolve(found.gameDetails.pgn);
        }
      };

      this.tempSocket.onerror = () => {
        if (this.tempSocket) {
          this.tempSocket.close();
        }

        reject();
      };
    });
  }

  private checkMsgIsGameUpdate(msg: CCCMessage): msg is CCCGameUpdate {
    if (msg.type === "gameUpdate") {
      return true;
    }
    return false;
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
