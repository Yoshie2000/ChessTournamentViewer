import z from "zod";

export const CCCTimeControlSchema = z.object({
  init: z.number(),
  incr: z.number(),
});

export const CCCEngineSchema = z.object({
  authors: z.string(),
  config: z.object({
    command: z.string(),
    timemargin: z.number().nullish(),
    options: z.record(z.string(), z.union([z.string(), z.number()])),
    version: z.string().optional(),
  }),
  country: z.string(),
  elo: z.string(),
  facts: z.string(),
  flag: z.string(),
  id: z.string(),
  imageUrl: z.string(),
  name: z.string(),
  perf: z.string(),
  playedGames: z.string().optional(),
  points: z.string(),
  rating: z.string(),
  updatedAt: z.string(),
  version: z.string(),
  website: z.string(),
  year: z.string(),
});

export const CCCGameSchema = z.object({
  blackId: z.string(),
  blackName: z.string().nullish(),
  estimatedStartTime: z.unknown(),
  gameNr: z.string(),
  matchNr: z.string(),
  opening: z.string(),
  openingType: z.string(),
  outcome: z.string().nullish(),
  roundNr: z.string(),
  timeControl: z.string(),
  timeStart: z.string().nullish(),
  timeEnd: z.string().nullish(),
  variant: z.string(),
  whiteId: z.string(),
  whiteName: z.string().nullish(),
});

export const CCCEventUpdateSchema = z.object({
  type: z.literal("eventUpdate"),
  tournamentDetails: z.object({
    name: z.string(),
    tNr: z.string(),
    tc: CCCTimeControlSchema,
    schedule: z.object({
      past: z.array(CCCGameSchema),
      present: CCCGameSchema.optional(),
      future: z.array(CCCGameSchema),
    }),
    engines: z.array(CCCEngineSchema),
    // we add these later when parsing messages
    hasGamePairs: z.union([z.boolean(), z.undefined()]).optional(),
    isRoundRobin: z.union([z.boolean(), z.undefined()]).optional(),
  }),
});

export const CCCGameUpdateSchema = z.object({
  type: z.literal("gameUpdate"),
  gameDetails: z.object({
    gameNr: z.union([z.string(), z.number()]),
    live: z.boolean().nullish(),
    opening: z.string(),
    pgn: z.string(),
    termination: z.string().nullish(),
  }),
});

export const CCCClocksSchema = z.object({
  type: z.literal("clocks"),
  binc: z.string().nullish(),
  btime: z.string().nullish(),
  winc: z.string().nullish(),
  wtime: z.string().nullish(),
});

export const CCCLiveInfoSchema = z.object({
  type: z.literal("liveInfo"),
  info: z.object({
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
  }),
});

export const CCCNewMoveSchema = z.object({
  type: z.literal("newMove"),
  move: z.string(),
  times: z.object({ w: z.number(), b: z.number() }),
});

export const CCCEventSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  tc: CCCTimeControlSchema.nullish(),
});

export const CCCEventListUpdateSchema = z.object({
  type: z.literal("eventsListUpdate"),
  events: z.array(CCCEventSchema),
});

export const CCCResultSchema = z.object({
  type: z.literal("result"),
  reason: z.string(),
  score: z.string(),
  whiteName: z.string(),
  blackName: z.string(),
});

export const CCCKibitzerSchema = z.object({
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

export const CCCMessageListSchema = z.array(CCCMessageSchema);
