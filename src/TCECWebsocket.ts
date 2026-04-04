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
  EmptyEngineDefinition,
  extractLiveInfoFromInfoString,
  extractLiveInfoFromTCECComment,
  parseTCECLiveInfo,
} from "./LiveInfo";

export class TCECWebSocket implements TournamentWebSocket {
  private socket: SocketIOClient.Socket | null = null;
  private callback: ((message: CCCMessage) => void) | null = null;
  private connected: boolean = false;

  private live: boolean = true;
  private game: Chess960 = new Chess960();
  private event: CCCEventUpdate | null = null;

  async send(msg: any) {
    if (msg.type === "requestEvent") {
      const gameNr: string | undefined = msg.gameNr;
      const eventNr: string | undefined = msg.eventNr;

      if (eventNr) {
        // This code needs to distinguish a bunch of cases
        const [pgnResponse, crosstableResponse, scheduleResponse] =
          await Promise.all([
            fetch(
              `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_${gameNr ?? 1}.pgn`
            ),
            fetch(`https://ctv.yoshie2000.de/tcec/crosstable.json`),
            fetch(
              `https://ctv.yoshie2000.de/tcec/archive/json/${eventNr}_Schedule.sjson`
            ),
          ]);
        const pgn = await pgnResponse.text();
        const crosstable = await crosstableResponse.json();
        const schedule = await scheduleResponse.json();

        const game = new Chess960();
        try {
          game.loadPgn(pgn);
        } catch (error) {
          // The backend threw a 404, which means this is a live game
          this.send({ type: "requestEvent" });
          return;
        }

        // Round is needed for the kibitzer endpoints
        const round = game.getHeaders()["Round"];
        // The schedule link is different for the ongoing event
        const isLive = crosstable.Event.replaceAll(" ", "_") === eventNr;

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
        const safeEventNr = (eventNr ?? this.game.getHeaders()["Event"])
          .replaceAll(" ", "_")
          .replaceAll("DivP", "Divp");
        const pgn = await (
          await fetch(
            `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr}_${gameNr}.pgn`
          )
        ).text();
        this.live = false;
        console.log(gameNr, "sdfsdf");
        this.openGame(gameNr, pgn);

        const game = new Chess960();
        game.loadPgn(pgn);
        const round = game.getHeaders()["Round"];

        const [lc0Response, sfResponse] = await Promise.all([
          fetch(
            `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr.toLowerCase()}_liveeval_${round}.json`
          ),
          fetch(
            `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr.toLowerCase()}_liveeval1_${round}.json`
          ),
        ]);

        this.loadKibitzerData(
          await lc0Response.json(),
          await sfResponse.json()
        );
      } else {
        this.live = true;
        this.disconnect();
        this.connect(this.callback ?? function () {});
      }
    } else {
      console.log("NOT IMPLEMENTED FOR TCECWebsocket: ", msg);
    }
  }

  async fetchReverseFor(
    gameNumber: number
  ): Promise<{ pgn: string; reverseGameNumber: number } | null> {
    // TODO this check is bugged for finals for whatever reason so I'll leave it for now
    // if (this.event?.tournamentDetails.isRoundRobin) {
    //   return null;
    // }

    const reverseGameNumber =
      gameNumber % 2 === 0 ? gameNumber - 1 : gameNumber + 1;

    try {
      const safeEventNr = this.game
        .getHeaders()
        ["Event"].replaceAll(" ", "_")
        .replaceAll("DivP", "Divp");

      const pgn = await (
        await fetch(
          `https://ctv.yoshie2000.de/tcec/archive/json/${safeEventNr}_${reverseGameNumber}.pgn`
        )
      ).text();

      const game = new Chess960();
      game.loadPgn(pgn);

      return { pgn, reverseGameNumber };
    } catch (err) {
      console.log(err);
      return null;
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

    this.socket.on("htmlread", (json: any) => {
      if (!this.live) return;

      const latestUsefulLine = (json.data.split("\n") as string[])
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

    // this.socket.on("livechart", (json: any) => {
    //   console.log("livechart", json);
    // });

    // this.socket.on("livechart1", (json: any) => {
    //   console.log("livechart1", json);
    // });

    this.socket.on("liveeval", (json: any) => {
      if (!this.live) return;

      this.callback?.(parseTCECLiveInfo(json, this.game.fen(), "blue"));
    });

    this.socket.on("liveeval1", (json: any) => {
      if (!this.live) return;

      this.callback?.(parseTCECLiveInfo(json, this.game.fen(), "red"));
    });

    this.socket.on("pgn", (json: any) => {
      if (!this.live) return;

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
      const ignoreIndex = (json.Moves as any[]).findIndex((moveData) => {
        const moveFenParts = moveData.fen.split(" ");
        const moveFen =
          moveFenParts.slice(0, -2).join(" ") + " " + moveFenParts.at(-1);
        return fen === moveFen;
      });

      let wtime: string | undefined = undefined,
        btime: string | undefined = undefined;
      for (const moveData of json.Moves.slice(ignoreIndex + 1)) {
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
          fenBeforeMove
        );
        if (liveInfo) {
          this.callback?.(liveInfo);
        }
      }

      onMessage({ type: "clocks", binc: "1", winc: "1", btime, wtime });

      if (json.Headers.Result !== "*") {
        this.callback?.({
          type: "result",
          blackName: json.Headers.Black,
          whiteName: json.Headers.White,
          reason: json.Headers.TerminationDetails,
          score: json.Headers.Result,
        });

        this.game.setHeader("Result", json.Headers.Result);
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

  fetchEventList(onEventList: (msg: CCCEventsListUpdate) => void) {
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
        onEventList(eventList);
      });
  }

  isConnected() {
    return !!this.socket && this.connected;
  }

  setHandler(onMessage: (message: CCCMessage) => void) {
    this.callback = onMessage;
  }

  private loadKibitzerData(lc0: any, sf: any) {
    if (lc0)
      this.callback?.({
        type: "kibitzer",
        color: "blue",
        engine: {
          ...EmptyEngineDefinition,
          name: lc0.desc.split(" ").slice(0, 2).join(" "),
          imageUrl: "https://ctv.yoshie2000.de/tcec/image/engine/Lc0.png",
        },
      });
    if (sf)
      this.callback?.({
        type: "kibitzer",
        color: "red",
        engine: {
          ...EmptyEngineDefinition,
          name: sf.desc.split(" ")[0],
          imageUrl: `https://ctv.yoshie2000.de/tcec/image/engine/${sf.desc.split(" ")[0]}.png`,
        },
      });

    function plyFromPv(pv: string) {
      const isBlackMove = pv.includes("...");
      const moveNumber = Number(pv.split(".")[0]);
      if (isBlackMove) return moveNumber * 2;
      return moveNumber * 2 - 1;
    }

    if (lc0)
      (lc0.moves as any[]).forEach((lc0Move) => {
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
    if (sf)
      (sf.moves as any[]).forEach((sfMove) => {
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

  private openEvent(
    scheduleURL: string,
    crosstableURL: string,
    pgnURL: string,
    lc0URL: string,
    sfURL: string,
    gameNr?: string
  ) {
    Promise.all([
      fetch(scheduleURL),
      fetch(crosstableURL),
      fetch(pgnURL),
      fetch(lc0URL),
      fetch(sfURL),
    ])
      .then((responses) =>
        Promise.allSettled([
          responses[0].json(),
          responses[1].json(),
          responses[2].text(),
          responses[3].json(),
          responses[4].json(),
        ])
      )
      .then((jsons) => {
        const [schedule, crosstable, livePGN, lc0, sf] = jsons;

        if (
          schedule.status !== "fulfilled" ||
          crosstable.status !== "fulfilled" ||
          livePGN.status !== "fulfilled"
        )
          return;

        const engines: CCCEngine[] = Object.keys(crosstable.value.Table).map(
          (engineName) => {
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
                "https://ctv.yoshie2000.de/tcec/image/engine/" +
                correctName +
                ".png",
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
          }
        );

        function toCccGame(game: any, index: number): CCCGame {
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
            gameNr: String(index + 1),
            matchNr: "",
            opening: game.Opening,
            openingType: game.Opening,
            roundNr: game.Round,
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

        const cccGameSchedule = (schedule.value as any[]).map(toCccGame);

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
              first.blackId === second.whiteId &&
              first.whiteId === second.blackId
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

        console.log(gameNr, present, past[0]);
        this.openGame(gameNr ?? (present ?? past[0]).gameNr, livePGN.value);

        this.loadKibitzerData(
          lc0.status === "fulfilled" ? lc0.value : undefined,
          sf.status === "fulfilled" ? sf.value : undefined
        );
      });
  }

  private openGame(gameNr: string, pgn: string) {
    if (!this.event || !this.callback) return;

    this.game.loadPgn(pgn);
    this.game.setHeader("White", this.game.getHeaders()["White"].split(" ")[0]);
    this.game.setHeader("Black", this.game.getHeaders()["Black"].split(" ")[0]);

    const gameList = [
      ...this.event.tournamentDetails.schedule.past,
      ...(this.event.tournamentDetails.schedule.present
        ? [this.event.tournamentDetails.schedule.present]
        : []),
    ];

    const current = gameList.find((game) => game.gameNr === gameNr);

    console.log(current, gameNr);

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
  }

  disconnect(): void {
    this.socket?.close();
    this.connected = false;
  }
}
