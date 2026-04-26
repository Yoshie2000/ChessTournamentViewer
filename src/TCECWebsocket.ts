import io from "socket.io-client";
import type {
  SocketMessageFromClient,
  TournamentWebSocket,
} from "./CCCWebsocket";
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
  EmptyEngineDefinition,
  extractLiveInfoFromInfoString,
  extractLiveInfoFromTCECComment,
  parseTCECLiveInfo,
} from "./LiveInfo";
import z from "zod";
import { htmlReadSchema, scheduleSchema } from "./schemas/tcec/scheduleSchema";
import { crosstableSchema } from "./schemas/tcec/crosstableSchema";
import { kibitzerSchema } from "./schemas/tcec/kibitzerSchema";
import { socketPgnSchema } from "./schemas/tcec/socketPgnSchema";
import { eventListSchema } from "./schemas/tcec/eventListSchema";

export class TCECWebSocket implements TournamentWebSocket {
  private socket: SocketIOClient.Socket | null = null;
  private callback: ((message: CCCMessage) => void) | null = null;
  private connected: boolean = false;

  private live: boolean = true;
  private game: Chess960 = new Chess960();
  private event: CCCEventUpdate | null = null;

  async send(msg: SocketMessageFromClient) {
    if (msg.type === "requestEvent") {
      const gameNr: string | undefined = msg.gameNr;
      let eventNr: string | undefined = msg.eventNr;

      if (eventNr) {
        eventNr = toTitleCaseTCEC(eventNr);

        // This code needs to distinguish a bunch of cases
        const [pgnResponse, crosstableResponse, scheduleResponse] =
          await Promise.allSettled([
            fetch(
              `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_${gameNr ?? 1}.pgn`
            ),
            fetch(`https://ctv.yoshie2000.de/tcec/crosstable.json`),
            fetch(
              `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Schedule.sjson`
            ),
          ]);

        const pgn =
          pgnResponse.status === "fulfilled"
            ? await pgnResponse.value.text()
            : null;

        const crosstable =
          crosstableResponse.status === "fulfilled"
            ? await crosstableResponse.value.json()
            : null;

        const schedule =
          scheduleResponse.status === "fulfilled"
            ? await scheduleResponse.value.json()
            : null;

        const game = new Chess960();
        try {
          if (pgn) {
            game.loadPgn(pgn);
          }
        } catch (err) {
          console.log("Error loading pgn: ");
          console.log(err);
          // The backend threw a 404, which means this is a live game
          this.send({ type: "requestEvent" });
          return;
        }

        // Round is needed for the kibitzer endpoints
        const round = game.getHeaders()["Round"];
        // The schedule link is different for the ongoing event
        const isLive =
          crosstable.Event.replaceAll(" ", "_").toLowerCase() ===
          eventNr.toLowerCase();

        if (isLive && !gameNr) {
          this.send({
            type: "requestEvent",
            gameNr: String(schedule.length + 1),
            eventNr,
          });
          return;
        }

        this.live = false;

        const scheduleLink = isLive
          ? "https://ctv.yoshie2000.de/tcec/schedule.json"
          : `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Schedule.sjson`;
        this.openEvent(
          scheduleLink,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Crosstable.cjson`,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_${gameNr ?? 1}.pgn`,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr.toLowerCase()}_liveeval_${round}.json`,
          `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr.toLowerCase()}_liveeval1_${round}.json`,
          gameNr
        );
      } else if (gameNr) {
        const safeEventNr = toTitleCaseTCEC(
          eventNr ?? this.game.getHeaders()["Event"]
        );

        const response = await fetch(
          `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr}_${gameNr}.pgn`
        ).catch(console.log);

        if (!response) {
          // TODO: add retry logic here???
          return;
        }

        const pgn = await response.text().catch(console.log);
        if (!pgn) {
          // cannot gracefully recover?
          return;
        }

        this.live = false;

        this.openGame(gameNr, pgn);

        const game = new Chess960();

        try {
          game.loadPgn(pgn);
        } catch (err) {
          console.log("error loading pgn: ");
          console.log(err);
          console.log("PGN: ", pgn);
        }

        const round = game.getHeaders()["Round"];

        const [lc0Response, sfResponse] = await Promise.allSettled([
          fetch(
            `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr.toLowerCase()}_liveeval_${round}.json`
          ),
          fetch(
            `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr.toLowerCase()}_liveeval1_${round}.json`
          ),
        ]);

        const lc0Data =
          lc0Response.status === "fulfilled"
            ? await lc0Response.value.json()
            : null;
        const sfData =
          sfResponse.status === "fulfilled"
            ? await sfResponse.value.json()
            : null;

        this.loadKibitzerData(lc0Data, sfData);
      } else {
        this.live = true;
        this.disconnect();
        this.connect(this.callback ?? function () {});
      }
    } else {
      console.log("NOT IMPLEMENTED FOR TCECWebsocket: ", msg);
    }
  }

  connect(
    onMessage: (message: CCCMessage) => void,
    initialEventId?: string,
    initialGameId?: string
  ) {
    this.callback = onMessage;
    if (this.isConnected()) return;
    this.connected = true;

    this.socket = io.connect("https://tcec-chess.com", {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("htmlread", (json: unknown) => {
      if (!this.live) return;

      const validationResult = z.safeParse(htmlReadSchema, json);

      if (!validationResult.success) {
        console.warn("Error validating data, aborting...");
        console.warn(validationResult.error);

        return;
      }

      const { data } = validationResult.data;

      const latestUsefulLine = data
        .split("\n")
        .filter((line) => !line.includes("currmove"))
        .at(-1);
      const infoString = latestUsefulLine?.split(": ")[1] ?? "";
      const liveInfo = extractLiveInfoFromInfoString(
        infoString,
        this.game.fen()
      );

      if (infoString && liveInfo) {
        this.callback?.(liveInfo.liveInfo);
      }
    });

    this.socket.on("livechart", (json: any) => {
      console.log("livechart");
      console.log(json);

      if (!this.live) return;

      const moveData = json.moves.at(-1);
      if (moveData.pv.includes("...")) {
        let score = String(moveData.eval);
        if (score.includes("-")) score = score.replace("-", "+");
        else if (score.includes("+")) score = score.replace("+", "-");
        else score = "-" + score;
        moveData.eval = score;
      }

      this.callback?.(
        parseTCECLiveInfo(
          moveData,
          this.game.fenAt(this.game.length() - 1),
          "blue"
        )
      );
    });

    this.socket.on("livechart1", (json: any) => {
      console.log("livechart1");
      console.log(json);
      if (!this.live) return;

      const moveData = json.moves.at(-1);
      if (moveData.pv.includes("...")) {
        let score = String(moveData.eval);
        if (score.includes("-")) score = score.replace("-", "+");
        else if (score.includes("+")) score = score.replace("+", "-");
        else score = "-" + score;
        moveData.eval = score;
      }

      this.callback?.(
        parseTCECLiveInfo(
          moveData,
          this.game.fenAt(this.game.length() - 1),
          "red"
        )
      );
    });

    this.socket.on("liveeval", (json: any) => {
      console.log("liveeval");
      console.log(json);
      if (!this.live) return;

      this.callback?.(parseTCECLiveInfo(json, this.game.fen(), "blue"));
    });

    this.socket.on("liveeval1", (json: any) => {
      console.log("liveeval1");
      console.log(json);
      if (!this.live) return;

      this.callback?.(parseTCECLiveInfo(json, this.game.fen(), "red"));
    });

    this.socket.on("pgn", (json: unknown) => {
      const pgnValidation = z.safeParse(socketPgnSchema, json);

      if (!pgnValidation.success) {
        console.log("Error validation pgn from socket.\nIssues:");
        console.log(pgnValidation.error.issues);

        console.log("Errored data: ", json);
        return;
      }

      if (!this.live) return;

      const pgnData = pgnValidation.data;

      if (this.live && this.game.getHeaders()["Result"] !== "*") {
        this.disconnect();
        this.connect(this.callback ?? function () {});
        return;
      }

      // For some reason, the halfmove numbers sometimes differ
      const fenParts = this.game
        .fen({ forceEnpassantSquare: false })
        .split(" ");
      const fen = fenParts.slice(0, -2).join(" ") + " " + fenParts.at(-1);

      const ignoreIndex = pgnData.Moves.findIndex((moveData) => {
        const moveFenParts = moveData.fen.split(" ");
        const moveFen =
          moveFenParts.slice(0, -2).join(" ") + " " + moveFenParts.at(-1);
        return fen === moveFen;
      });

      let wtime: string | undefined = undefined,
        btime: string | undefined = undefined;

      for (const moveData of pgnData.Moves.slice(ignoreIndex + 1)) {
        const fenBeforeMove = this.game.fen();

        // Make the move
        const move = this.game
          .moves({ verbose: true })
          .find((move) => move.san === moveData.m);

        if (!move) break;

        // Update clock
        if (this.game.turn() === "w") wtime = moveData.tl;
        else btime = moveData.tl;

        this.game.move(move.san, { strict: false });

        this.callback?.({
          type: "newMove",
          move: move.lan,
          times: { w: 1, b: 1 },
        });

        // Extract the live info
        const relevantKeys = Object.keys(moveData).filter((key) => {
          return !key.includes(" ") || key === "pv";
        });
        moveData.pv = moveData.pv.San; // ?
        const commentString = relevantKeys
          .map((key) => `${key}=${moveData[key]}`)
          .join(", ");
        const liveInfo = extractLiveInfoFromTCECComment(
          commentString,
          fenBeforeMove
        );
        if (liveInfo && this.callback) {
          this.callback(liveInfo);
        }
      }

      onMessage({ type: "clocks", binc: "1", winc: "1", btime, wtime });

      if (pgnData.Headers.Result !== "*") {
        this.callback?.({
          type: "result",
          blackName: pgnData.Headers.Black,
          whiteName: pgnData.Headers.White,
          reason: pgnData.Headers.TerminationDetails,
          score: pgnData.Headers.Result,
        });

        this.game.setHeader("Result", pgnData.Headers.Result);
      }
    });

    this.socket.on("schedule", () => {
      if (this.live) {
        this.disconnect();
        this.connect(this.callback ?? function () {});
      }
    });

    // this.socket.on("updeng", (json: any) => {
    //   console.log("updeng", json);
    // });

    this.socket.on("connect", () => {
      this.socket?.emit("room", "roomall");
    });

    if (initialEventId || initialGameId) {
      this.send({
        type: "requestEvent",
        eventNr: initialEventId,
        gameNr: initialGameId,
      });
    } else {
      this.openEvent(
        "https://ctv.yoshie2000.de/tcec/schedule.json",
        "https://ctv.yoshie2000.de/tcec/crosstable.json",
        "https://ctv.yoshie2000.de/tcec/live.pgn",
        "https://ctv.yoshie2000.de/tcec/liveeval.json",
        "https://ctv.yoshie2000.de/tcec/liveeval1.json"
      );
    }

    this.fetchEventList((msg) => this.callback?.(msg));
  }

  async fetchEventList(onEventList: (msg: CCCEventsListUpdate) => void) {
    // TODO add zod schema for the response
    const response = await fetch(
      "https://ctv.yoshie2000.de/tcec/archive/gamelist.json"
    ).catch(console.log);

    if (!response) {
      // TODO: retry logic and loggin here?
      console.log(
        "Unable to fetch gamelist from archive, UNIMPLEMENTED:retry..."
      );

      return;
    }

    const seasonsObj = await response.json().catch(console.log);

    if (!seasonsObj) {
      // TODO do something?
      // ? we cannot gracefully recover from this error ??
      return;
    }

    const seasonsValidation = z.safeParse(eventListSchema, seasonsObj);

    if (!seasonsValidation.success) {
      console.log("Error validating seasons data\nIssues:");
      console.log(seasonsValidation.error.issues);

      console.log("Errored data: ");
      console.log(seasonsObj);
      return;
    }

    const seasonList = seasonsValidation.data.Seasons;

    const eventList: CCCEventsListUpdate = {
      type: "eventsListUpdate",
      events: [],
    };

    for (const seasonKey of Object.keys(seasonList).reverse()) {
      // I don't want to deal with this monstrosity yet
      if (seasonKey.includes("Cup") || seasonKey.includes("Bonus")) continue;

      const _season = seasonList[seasonKey];
      const title = "Season " + seasonKey;

      const subs = _season.sub.sort((a, b) =>
        (b.dno + "").localeCompare(a.dno + "")
      );

      for (const sub of subs) {
        if (sub.menu.includes("-=")) continue;

        eventList.events.push({ id: sub.abb, name: title + " - " + sub.menu });
      }
    }
    onEventList(eventList);
  }

  isConnected() {
    return !!this.socket && this.connected;
  }

  setHandler(onMessage: (message: CCCMessage) => void) {
    this.callback = onMessage;
  }

  private loadKibitzerData(
    lc0: z.infer<typeof kibitzerSchema> | undefined,
    sf: z.infer<typeof kibitzerSchema> | undefined
  ) {
    if (lc0 && "desc" in lc0 && lc0.desc) {
      this.callback?.({
        type: "kibitzer",
        color: "blue",
        engine: {
          ...EmptyEngineDefinition,
          name: lc0.desc.split(" ").slice(0, 2).join(" "),
          imageUrl: "https://ctv.yoshie2000.de/tcec/image/engine/Lc0.png",
        },
      });
    }
    if (sf && "desc" in sf && sf.desc) {
      this.callback?.({
        type: "kibitzer",
        color: "red",
        engine: {
          ...EmptyEngineDefinition,
          name: sf.desc.split(" ")[0],
          imageUrl: `https://ctv.yoshie2000.de/tcec/image/engine/${sf.desc.split(" ")[0]}.png`,
        },
      });
    }

    function plyFromPv(pv: string) {
      const isBlackMove = pv.includes("...");
      const moveNumber = Number(pv.split(".")[0]);
      if (isBlackMove) return moveNumber * 2;
      return moveNumber * 2 - 1;
    }

    if (lc0) {
      lc0.moves?.forEach((lc0Move) => {
        if (lc0Move.pv.includes("...")) {
          if (typeof lc0Move.eval === "string") {
            if (lc0Move.eval.startsWith("-"))
              lc0Move.eval = lc0Move.eval.replace("-", "+");
            else lc0Move.eval = lc0Move.eval.replace("+", "-");
          } else {
            lc0Move.eval *= -1;
          }
        }

        const ply = plyFromPv(lc0Move.pv);
        this.callback?.(
          parseTCECLiveInfo(lc0Move, this.game.fenAt(ply - 1), "blue")
        );
      });
    }
    if (sf) {
      sf.moves?.forEach((sfMove) => {
        if (sfMove.pv.includes("...")) {
          if (typeof sfMove.eval === "string") {
            if (sfMove.eval.startsWith("-"))
              sfMove.eval = sfMove.eval.replace("-", "+");
            else sfMove.eval = sfMove.eval.replace("+", "-");
          } else {
            sfMove.eval *= -1;
          }
        }

        const ply = plyFromPv(sfMove.pv);
        this.callback?.(
          parseTCECLiveInfo(sfMove, this.game.fenAt(ply - 1), "red")
        );
      });
    }
  }

  private async openEvent(
    scheduleURL: string,
    crosstableURL: string,
    pgnURL: string,
    lc0URL: string,
    sfURL: string,
    gameNr?: string
  ) {
    const responses = await Promise.allSettled([
      fetch(scheduleURL),
      fetch(crosstableURL),
      fetch(pgnURL),
      fetch(lc0URL),
      fetch(sfURL),
    ]);

    const jsons = await Promise.allSettled([
      handleIfFulfilled(responses[0], "json"),
      handleIfFulfilled(responses[1], "json"),
      handleIfFulfilled(responses[2], "text"),
      handleIfFulfilled(responses[3], "json"),
      handleIfFulfilled(responses[4], "json"),
    ]);

    const [schedule, crosstable, livePGN, lc0, sf] = jsons;

    if (
      schedule.status !== "fulfilled" ||
      crosstable.status !== "fulfilled" ||
      livePGN.status !== "fulfilled"
    ) {
      return;
    }

    const scheduleValidation = z.safeParse(scheduleSchema, schedule.value);
    const crosstableValidation = z.safeParse(
      crosstableSchema,
      crosstable.value
    );

    if (!scheduleValidation.success) {
      console.log("Schedule validation failed\nIssues:");
      console.log(scheduleValidation.error.issues);
      console.log("Errored data:", schedule.value);
      return;
    }

    if (!crosstableValidation.success) {
      console.log("Crosstable validation failed\nIssues:");
      console.log(crosstableValidation.error.issues);
      console.log("Errored data:", crosstable.value);
      return;
    }

    if (lc0.status === "fulfilled") {
      const lc0Validation = z.safeParse(kibitzerSchema, lc0.value);
      if (!lc0Validation.success) {
        console.log("kibitzer 1 validation failed");
        console.log(lc0Validation.error.issues);
        console.log("Errored data:", lc0.value);
      }
    }

    if (sf.status === "fulfilled") {
      const sfValidation = z.safeParse(kibitzerSchema, sf.value);
      if (!sfValidation.success) {
        console.log("kibitzer 1 validation failed");
        console.log(sfValidation.error.issues);
        console.log("Errored data:", sf.value);
      }
    }

    const { data } = crosstableValidation;
    const engines: CCCEngine[] = Object.keys(data.Table).map((engineName) => {
      const engineData = crosstable.value.Table[engineName];
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
          "https://ctv.yoshie2000.de/tcec/image/engine/" + correctName + ".png",
        name: correctName,
        perf: String(engineData.Performance),
        playedGames: "",
        points: String(engineData.Score),
        rating: String(engineData.Rating),
        updatedAt: "",
        version: engineVersion,
        website: "",
        year: "",
      };
    });

    const cccGameSchedule: CCCGame[] = scheduleValidation.data
      .map((game, index) => {
        if (!game) {
          return null;
        }

        if (!("Start" in game)) {
          return null;
        }

        const [time, , date] = game.Start.split(" ") ?? [
          "00:00:00",
          "on",
          "1970.01.01",
        ];
        const isoString = `${date.replace(/\./g, "-")}T${time}Z`;
        const startDate = new Date(isoString);

        const [hours, minutes, seconds] =
          "Duration" in game ? game.Duration.split(":").map(Number) : [0, 0, 0];

        const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;

        const gameStarted = !!game.Result;
        const gameOver = !!game.Result && game.Result !== "*";

        const black = game.Black.split(" ")[0];
        const white = game.White.split(" ")[0];

        const opening = "Opening" in game ? game.Opening : "unknown";

        return {
          blackId: black,
          blackName: black,
          estimatedStartTime: "",
          gameNr: String(index + 1),
          matchNr: "",
          opening: opening,
          openingType: opening, // we have `game.ECO` sometimes
          roundNr: "unknown", // we do not have `game.Round` in TCEC I think
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
      })
      .filter((el) => !!el);

    const past = cccGameSchedule.filter((game) => !!game.timeEnd);
    const present = cccGameSchedule.find(
      (game) => !!game.timeStart && !game.timeEnd
    );
    const future = cccGameSchedule.filter(
      (game) => !game.outcome && !game.timeStart
    );

    const allGames = [...past, ...(present ? [present] : []), ...future];

    // Create an empty set of opponents per engine
    const opponentsPerEngine = engines.reduce(
      (prev, cur) => ({ ...prev, [cur.id]: new Set<string>() }),
      {} as Record<string, Set<string>>
    );

    // Check that each pair of consecutive games has switched opponents
    const hasGamePairs = allGames
      .map((_, idx) => {
        const pairStart = 2 * Math.floor(idx / 2);
        const first = allGames[pairStart];
        const second = allGames[pairStart + 1];

        if (!second) {
          return true;
        }

        // Ignore games without valid engines
        if (
          opponentsPerEngine[first.blackId] === undefined ||
          opponentsPerEngine[first.whiteId] === undefined ||
          opponentsPerEngine[second.blackId] === undefined ||
          opponentsPerEngine[second.whiteId] === undefined
        ) {
          return true;
        }

        opponentsPerEngine[first.blackId].add(first.whiteId);
        opponentsPerEngine[first.whiteId].add(first.blackId);
        opponentsPerEngine[second.blackId].add(second.whiteId);
        opponentsPerEngine[second.whiteId].add(second.blackId);

        return (
          first.blackId === second.whiteId && first.whiteId === second.blackId
        );
      })
      .every((value) => value);

    // Check that all engines are playing each other
    const isRoundRobin = engines.every(
      (engine) => opponentsPerEngine[engine.id].size === engines.length - 1
    );

    const event: CCCEventUpdate = {
      type: "eventUpdate",
      tournamentDetails: {
        name: crosstable.value.Event,
        tNr: crosstable.value.Event.replaceAll(" ", "_"),
        tc: { incr: 0, init: 0 },
        engines,
        schedule: { past, future, present },
        hasGamePairs,
        isRoundRobin,
      },
    };
    this.callback?.(event);
    this.event = event;

    this.openGame(gameNr ?? (present ?? past[0]).gameNr, livePGN.value);

    this.loadKibitzerData(
      lc0.status === "fulfilled" ? lc0.value : undefined,
      sf.status === "fulfilled" ? sf.value : undefined
    );
  }

  private openGame(gameNr: string, pgn: string) {
    if (!this.event || !this.callback) return;

    try {
      this.game.loadPgn(pgn);
    } catch (err) {
      console.log("error loading PGN\n", err);
    }

    const white = this.game.getHeaders()["White"].split(" ")[0];
    const black = this.game.getHeaders()["Black"].split(" ")[0];
    this.game.setHeader("White", white);
    this.game.setHeader("Black", black);

    const gameList = [
      ...this.event.tournamentDetails.schedule.past,
      ...(this.event.tournamentDetails.schedule.present
        ? [this.event.tournamentDetails.schedule.present]
        : []),
    ];

    const current = gameList.find((game) => game.gameNr === gameNr);

    const gameUpdate: CCCGameUpdate = {
      type: "gameUpdate",
      gameDetails: {
        gameNr: String(current?.gameNr ?? gameList[0]?.gameNr ?? ""),
        live: true,
        opening: current?.opening ?? "",
        pgn: this.game.pgn(),
      },
    };
    this.callback(gameUpdate);

    const lastComment0 = this.game.getComments().at(-2);
    const lastComment1 = this.game.getComments().at(-1);
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

    const whiteToMove = this.game.turn() === "w";

    this.callback({
      type: "clocks",
      binc: "1",
      btime: whiteToMove ? clock1 : clock0,
      winc: "1",
      wtime: whiteToMove ? clock0 : clock1,
    });

    const optionsComment = this.game.getComments()[0].comment;
    const options = optionsComment?.split(", ");
    if (options) {
      function reduceOption(prev: Record<string, string>, cur: string) {
        const [name, value] = cur.split("=");
        return { ...prev, [name]: value.replace(";", "") };
      }

      const whiteOptions = options[0]
        .replace("WhiteEngineOptions: ", "")
        .split("; ")
        .reduce(reduceOption, {});
      const blackOptions = options[1]
        .replace("BlackEngineOptions: ", "")
        .split("; ")
        .reduce(reduceOption, {});

      const whiteEngine = this.event.tournamentDetails.engines.find(
        (engine) => engine.id === white
      )!;
      const blackEngine = this.event.tournamentDetails.engines.find(
        (engine) => engine.id === black
      )!;

      this.callback?.({
        type: "kibitzer",
        color: "white",
        engine: {
          ...whiteEngine,
          config: { ...whiteEngine.config, options: whiteOptions },
        },
      });
      this.callback?.({
        type: "kibitzer",
        color: "black",
        engine: {
          ...blackEngine,
          config: { ...blackEngine.config, options: blackOptions },
        },
      });
    }
  }

  disconnect(): void {
    this.socket?.close();
    this.connected = false;
  }
}

function toTitleCaseTCEC(input: string): string {
  return input
    .split(" ")
    .map((word, inx) => {
      const isEmptyOrTCECStr = word.length === 0 || inx === 0;
      if (isEmptyOrTCECStr) {
        return word;
      }
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("_");
}

function handleIfFulfilled(
  promise: PromiseSettledResult<Response>,
  method: "json" | "text"
) {
  return promise.status === "fulfilled"
    ? promise.value[method]()
    : Promise.reject();
}
