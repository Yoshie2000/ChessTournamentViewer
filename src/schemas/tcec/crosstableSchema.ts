import z from "zod";

const resultsSchema = z.record(
  z.string(),
  z.object({
    H2h: z.number(),
    // Text: z.enum(["1", "0", "="]),
    /**
     * string of `0`, `1` and `=`
     *
     * @example "00000111==1==010=1=00==01=0100=10===01==="
     */
    Text: z.string(),
    Scores: z.array(
      z.object({
        Game: z.number(),
        Result: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
        Winner: z.enum(["None", "Black", "White"]),
      })
    ),
  })
);

const tableEntryBase = z.object({
  Abbreviation: z.string(),
  Elo: z.number().nullish(),
  Games: z.number(),
  GamesAsBlack: z.number(),
  GamesAsWhite: z.number(),

  Neustadtl: z.number(),
  Performance: z.number(),
  Rank: z.number(),
  Rating: z.number(),

  Score: z.number(),
  Strikes: z.number(),
  WinsAsBlack: z.number(),
  WinsAsWhite: z.number(),

  MWinner: z.number().optional(),
  Mlead: z.number().optional(),
  OrigScore: z.number().optional(),
  Opponent: z.string().optional(),

  Results: resultsSchema,
});

const formattingH2h = z
  .object({ LossAsBlack: z.number(), LossAsWhite: z.number() })
  .and(tableEntryBase);

const formattingGauntlet = z
  .object({ LossesAsBlack: z.number(), LossesAsWhite: z.number() })
  .and(tableEntryBase);

export const crosstableSchema = z.object({
  Event: z.string(),
  // Type: eventType.optional(),
  Type: z.string().optional(),
  Order: z.array(z.string()),
  Table: z.record(z.string(), z.union([formattingH2h, formattingGauntlet])),
});
