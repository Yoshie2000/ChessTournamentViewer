import z from "zod";

const eventType = z.enum(["gauntlet"]);
const resultsSchema = z.record(
  z.string(),
  z.object({
    H2h: z.number(),
    Text: z.string(),
    Scores: z.array(
      z.object({ Game: z.number(), Result: z.number(), Winner: z.string() })
    ),
  })
);

const tableEntry = z.object({
  Abbreviation: z.string(),
  Elo: z.number(),
  Games: z.number(),
  GamesAsBlack: z.number(),
  GamesAsWhite: z.number(),
  LossAsBlack: z.number(),
  LossAsWhite: z.number(),
  Neustadtl: z.number(),
  Performance: z.number(),
  Rank: z.number(),
  Rating: z.number(),

  Score: z.number(),
  Strikes: z.number(),
  WinsAsBlack: z.number(),
  WinsAsWhite: z.number(),

  Results: resultsSchema,
});

export const crosstableSchema = z.object({
  Event: z.string(),
  Type: eventType,
  Order: z.array(z.string()),
  Table: z.record(z.string(), tableEntry),
});
