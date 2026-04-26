import z from "zod";

const timeControlSchema = z.object({ init: z.number(), incr: z.number() });

const CCCEngineSchema = z.object({
  authors: z.string(),
  config: {
    command: z.string(),
    timemargin: z.number(),
    options: z.record(z.string(), z.union([z.string(), z.number()])),
    version: z.string().optional(),
  },
  country: z.string(),
  elo: z.string(),
  facts: z.string(),
  flag: z.string(),
  id: z.string(),
  imageUrl: z.string(),
  name: z.string(),
  perf: z.string(),
  playedGames: z.string(),
  points: z.string(),
  rating: z.string(),
  updatedAt: z.string(),
  version: z.string(),
  website: z.string(),
  year: z.string(),
});

const CCCGameSchema = z.object({
  blackId: z.string(),
  blackName: z.string(),
  estimatedStartTime: z.unknown(),
  gameNr: z.string(),
  matchNr: z.string(),
  opening: z.string(),
  openingType: z.string(),
  outcome: z.string().optional(),
  roundNr: z.string(),
  timeControl: z.string(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  variant: z.string(),
  whiteId: z.string(),
  whiteName: z.string(),
});

const CCCEventUpdateSchema = z.object({
  type: z.literal("eventUpdate"),
  tournamentDetails: {
    name: z.string(),
    tNr: z.string(),
    tc: timeControlSchema,
    schedule: z.object({
      past: z.array(CCCGameSchema),
      present: CCCGameSchema.optional(),
      future: z.array(CCCGameSchema),
    }),
    engines: z.array(CCCEngineSchema),
    hasGamePairs: z.boolean(),
    isRoundRobin: z.boolean(),
  },
});

const CCCGameUpdateSchema = z.object({
  type: z.literal("gameUpdate"),
  gameDetails: {
    gameNr: z.string(),
    live: z.boolean(),
    opening: z.string(),
    pgn: z.string(),
    termination: z.string().optional(),
  },
});

const CCCClocksSchema = z.object({
  type: z.literal("clocks"),
  binc: z.string().optional(),
  btime: z.string().optional(),
  winc: z.string().optional(),
  wtime: z.string().optional(),
});

const CCCLiveInfoSchema = z.object({
  type: z.literal("liveInfo"),
  info: {
    color: z.string(),
    depth: z.string(),
    hashfull: z.string(),
    multipv: z.string(),
    name: z.string(),
    nodes: z.string(),
    ply: z.number(),
    pv: z.string(),
    pvSan: z.string(),
    score: z.string(),
    seldepth: z.string(),
    speed: z.string(),
    tbhits: z.string(),
    time: z.string(),
    timeLeft: z.number(),
  },
});

const CCCNewMoveSchema = z.object({
  type: z.literal("newMove"),
  move: z.string(),
  times: z.object({ w: z.number(), b: z.number() }),
});

const CCCEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  tc: timeControlSchema.optional(),
});

const CCCEventListUpdateSchema = z.object({
  type: z.literal("eventsListUpdate"),
  events: z.array(CCCEventSchema),
});

const CCCResultSchema = z.object({
  type: z.literal("result"),
  reason: z.string(),
  score: z.string(),
  whiteName: z.string(),
  /**
   * TODO: type this later
   *
   * blackName is `any` inside the types.d.ts file
   */
  blackName: z.unknown(),
});

const CCCKibitzerSchema = z.object({
  type: z.literal("kibitzer"),
  engine: CCCEngineSchema,
  color: z.string(),
});

export const CCCMessageSchema = z.discriminatedUnion("type", [
  CCCLiveInfoSchema,
  CCCNewMoveSchema,
  CCCClocksSchema,
  CCCEventUpdateSchema,
  CCCGameUpdateSchema,
  CCCResultSchema,
  CCCEventListUpdateSchema,
  CCCKibitzerSchema,
]);
