import io from "socket.io-client";
import type { TournamentWebSocket } from "./CCCWebsocket";
import type {
  CCCEngine,
  CCCEventsListUpdate,
  CCCEventUpdate,
  CCCGame,
  CCCGameUpdate,
  CCCMessage,
} from "./types";
import { Chess960 } from "./chess.js/chess";
import {
  extractLiveInfoFromInfoString,
  extractLiveInfoFromTCECComment,
  plyFromFen,
} from "./components/LiveInfo";

export class TCECSocket implements TournamentWebSocket {
  private socket: SocketIOClient.Socket | null = null;
  private onMessage: ((message: CCCMessage) => void) | null = null;

  private live: boolean = true;
  private game: Chess960 = new Chess960();
  private event: CCCEventUpdate | null = null;

  send(msg: any) {
    if (msg.type === "requestEvent") {
      const gameNr: string | undefined = msg.gameNr;
      const eventNr: string | undefined = msg.eventNr;

      if (gameNr) {
        const safeEventNr = eventNr ?? this.game.getHeaders()["Event"];
        fetch(
          `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr.replaceAll(" ", "_")}_${gameNr}.pgn`
        )
          .then((response) => response.text())
          .then((pgn) => {
            this.live = false;
            this.openGame(pgn);
          });
      } else if (!gameNr && !eventNr) {
        if (this.onMessage) {
          this.disconnect();
          this.connect(this.onMessage);
        }
      } else if (eventNr) {
        this.openEvent(
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Schedule.sjson`,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Crosstable.cjson`,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_1.pgn`
        );
      }
    } else {
      console.log("NOT IMPLEMENTED FOR TCECWebsocket: ", msg);
    }
  }

  connect(onMessage: (message: CCCMessage) => void) {
    this.onMessage = onMessage;

    this.socket = io.connect("https://tcec-chess.com", {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("banner", (json: any) => {
      console.log("banner", json);
    });

    this.socket.on("bracket", (json: any) => {
      console.log("bracket", json);
    });

    this.socket.on("crash", (json: any) => {
      console.log("crash", json);
    });

    this.socket.on("crosstable", (json: any) => {
      console.log("crosstable", json);
    });

    this.socket.on("htmlread", (json: any) => {
      // console.log("htmlread", json);
      if (!this.live) return;

      const latestUsefulLine = (json.data.split("\n") as string[])
        .filter((line) => !line.includes("currmove"))
        .at(-1);
      const infoString = latestUsefulLine?.split(": ")[1] ?? "";
      const liveInfo = extractLiveInfoFromInfoString(
        infoString,
        this.game.fen()
      );
      if (liveInfo) onMessage(liveInfo.liveInfo);
    });

    this.socket.on("livechart", (_: any) => {
      // console.log("livechart", json);
    });

    this.socket.on("livechart1", (_: any) => {
      // console.log("livechart1", json);
    });

    this.socket.on("liveeval", (_: any) => {
      // console.log("liveeval", json);
    });

    this.socket.on("liveeval1", (_: any) => {
      // console.log("liveeval1", json);
    });

    this.socket.on("pgn", (json: any) => {
      console.log("pgn", json);
      if (!this.live) return;

      if (this.game.getHeaders()["Result"] !== "*") {
        this.disconnect();
        this.connect(onMessage);
        return;
      }

      const ignoreIndex = (json.Moves as any[]).findIndex(
        (moveData) => moveData.fen === this.game.fen()
      );

      for (const moveData of json.Moves.slice(ignoreIndex + 1)) {
        const fenBeforeMove = this.game.fen();

        // Make the move
        const move = this.game
          .moves({ verbose: true })
          .find((move) => move.san === moveData.m)!;
        if (!move) console.log(moveData, this.game.moves({ verbose: true }));

        this.game.move(move.san, { strict: false });
        onMessage({ type: "newMove", move: move.lan, times: { w: 1, b: 1 } });

        // Extract the live info
        const relevantKeys = Object.keys(moveData).filter(
          (key) =>
            (typeof moveData[key] === "string" &&
              !moveData[key].includes(" ")) ||
            key === "pv"
        );
        moveData.pv = moveData.pv.San;
        const commentString = relevantKeys
          .map((key) => `${key}=${moveData[key]}`)
          .join(", ");
        const liveInfo = extractLiveInfoFromTCECComment(
          commentString,
          fenBeforeMove,
          plyFromFen(fenBeforeMove)
        );
        if (liveInfo) onMessage(liveInfo);
      }

      const whiteToMove = this.game.turn() === "w";
      const time0 = json.Moves.at(-2)?.tl ?? 1;
      const time1 = json.Moves.at(-1)?.tl ?? 1;

      onMessage({
        type: "clocks",
        binc: "1",
        winc: "1",
        btime: whiteToMove ? time0 : time1,
        wtime: whiteToMove ? time1 : time0,
      });

      if (json.Headers.Result !== "*") {
        onMessage({
          type: "result",
          blackName: json.Headers.Black,
          whiteName: json.Headers.White,
          reason: json.Headers.TerminationDetails,
          score: json.Headers.Result,
        });
        this.game.setHeader("Result", json.Headers.Result);
      }
    });

    this.socket.on("schedule", (json: any) => {
      console.log("schedule", json);
    });

    this.socket.on("updeng", (json: any) => {
      console.log("updeng", json);
    });

    this.socket.on("connect", () => {
      this.socket?.emit("room", "roomall");
    });

    this.openEvent(
      "https://ctv.yoshie2000.de/tcec/schedule.json",
      "https://ctv.yoshie2000.de/tcec/crosstable.json",
      "https://ctv.yoshie2000.de/tcec/live.pgn"
    );
    this.loadEventList();
  }

  private loadEventList() {
    if (!this.onMessage) return;

    fetch("https://ctv.yoshie2000.de/tcec/archive/gamelist.json")
      .then((response) => response.json())
      .then((seasons) => {
        const eventList: CCCEventsListUpdate = {
          type: "eventsListUpdate",
          events: [],
        };
        for (const seasonKey of Object.keys(seasons.Seasons).reverse()) {
          // I don't want to deal with this monstrosity yet
          if (seasonKey.includes("Cup") || seasonKey.includes("Bonus"))
            continue;

          const season = seasons.Seasons[seasonKey];
          const title = "Season " + seasonKey;
          const subs = season.sub.sort((a: any, b: any) =>
            (b.dno + "").localeCompare(a.dno + "")
          );

          for (const sub of subs) {
            if (sub.menu.includes("-=")) continue;

            eventList.events.push({
              id: sub.abb,
              name: title + " - " + sub.menu,
            });
          }
        }
        this.onMessage?.(eventList);
      });
  }

  private openEvent(
    scheduleURL: string,
    crosstableURL: string,
    pgnURL: string
  ) {
    Promise.all([fetch(scheduleURL), fetch(crosstableURL), fetch(pgnURL)])
      .then((responses) =>
        Promise.all([
          responses[0].json(),
          responses[1].json(),
          responses[2].text(),
        ])
      )
      .then((jsons) => {
        const [schedule, crosstable, livePGN] = jsons;

        this.game.loadPgn(livePGN);

        const engines: CCCEngine[] = Object.keys(crosstable.Table).map(
          (engineName) => {
            const engineData = crosstable.Table[engineName];
            const correctName = engineName.split(" ")[0];
            const engineVersion = engineName.split(" ").slice(1).join(" ");

            return {
              authors: "",
              config: { command: "", options: {}, timemargin: 0 },
              country: "",
              elo: String(engineData.Rating),
              facts: "",
              flag: "",
              id: correctName,
              imageUrl:
                "https://ctv.yoshie2000.de/tcec/image/engine/" +
                correctName +
                ".png",
              name: correctName,
              perf: String(engineData.Performance),
              points: String(engineData.Score),
              rating: String(engineData.Rating),
              updatedAt: "",
              version: engineVersion,
              website: "",
              year: "",
            };
          }
        );

        function toCccGame(game: any): CCCGame {
          if (!game) return undefined as unknown as CCCGame;

          const [time, , date] = game.Start?.split(" ") ?? [
            "00:00:00",
            "on",
            "1970.01.01",
          ];
          const isoString = `${date.replace(/\./g, "-")}T${time}Z`;
          const startDate = new Date(isoString);

          const [hours, minutes, seconds] = game.Duration?.split(":").map(
            Number
          ) ?? [0, 0, 0];
          const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;

          const gameStarted = !!game.Result;
          const gameOver = !!game.Result && game.Result !== "*";

          const black = game.Black.split(" ")[0];
          const white = game.White.split(" ")[0];

          return {
            blackId: black,
            blackName: black,
            estimatedStartTime: "",
            gameNr: String(game.Game),
            matchNr: "",
            opening: game.Opening,
            openingType: game.Opening,
            roundNr: "",
            timeControl: "",
            variant: "",
            whiteId: white,
            whiteName: white,
            outcome: gameOver ? game.Result : undefined,
            timeEnd: gameOver
              ? new Date(startDate.getTime() + duration).toString()
              : undefined,
            timeStart: gameStarted ? startDate.toString() : undefined,
          };
        }

        const past = (schedule as any[])
          .filter((game) => !!game.Result && game.Result !== "*")
          .map(toCccGame);
        const present = toCccGame(
          (schedule as any[]).find((game) => game.Termination === "in progress")
        );
        const future = (schedule as any[])
          .filter((game) => !game.Result && game.Termination !== "in progress")
          .map(toCccGame);

        const event: CCCEventUpdate = {
          type: "eventUpdate",
          tournamentDetails: {
            name: crosstable.Event,
            tNr: crosstable.Event.replaceAll(" ", "_"),
            tc: { incr: 0, init: 0 },
            engines,
            schedule: { past, future, present },
          },
        };
        this.onMessage?.(event);
        this.event = event;

        this.openGame(livePGN);
      });
  }

  private openGame(pgn: string) {
    if (!this.event || !this.onMessage) return;

    const game = new Chess960();
    game.loadPgn(pgn);
    game.setHeader("White", game.getHeaders()["White"].split(" ")[0])
    game.setHeader("Black", game.getHeaders()["Black"].split(" ")[0])

    const gameList = [
      ...this.event.tournamentDetails.schedule.past,
      ...(this.event.tournamentDetails.schedule.present
        ? [this.event.tournamentDetails.schedule.present]
        : []),
    ];

    const pgnStartTime = new Date(
      game.getHeaders()["GameStartTime"].replace(" UTC", "Z")
    ).getTime();
    const current = gameList.find(
      (game) =>
        Math.abs(
          new Date(game.timeStart?.replace(" UTC", "Z") ?? 0).getTime() -
            pgnStartTime
        ) <= 60000
    );
    const past = this.event.tournamentDetails.schedule.past;

    const gameUpdate: CCCGameUpdate = {
      type: "gameUpdate",
      gameDetails: {
        gameNr: String(current?.gameNr ?? past.at(-1)?.gameNr ?? ""),
        live: true,
        opening: current?.opening ?? "",
        pgn: game.pgn(),
      },
    };
    this.onMessage(gameUpdate);

    const lastComment0 = game.getComments().at(-2);
    const lastComment1 = game.getComments().at(-1);
    const lastComment0Data = lastComment0?.comment?.split(", ");
    const lastComment1Data = lastComment1?.comment?.split(", ");
    const clock0 =
      lastComment0Data?.[
        lastComment0Data.findIndex((s) => s.includes("tl="))
      ]?.split("=")[1] ?? "1";
    const clock1 =
      lastComment1Data?.[
        lastComment1Data.findIndex((s) => s.includes("tl="))
      ]?.split("=")[1] ?? "1";

    const whiteToMove = game.turn() === "w";

    this.onMessage({
      type: "clocks",
      binc: "1",
      btime: whiteToMove ? clock1 : clock0,
      winc: "1",
      wtime: whiteToMove ? clock0 : clock1,
    });
  }

  disconnect(): void {
    this.socket?.close();
  }
}
