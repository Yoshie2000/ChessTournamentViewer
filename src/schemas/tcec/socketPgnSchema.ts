import z from "zod";

const engineOptionsSchema = z.object({ Name: z.string(), Value: z.string() });
const pvSchema = z.object({
  San: z.string(),
  Moves: z.array(
    z.object({
      fen: z.string(),
      from: z.string(),
      to: z.string(),
      /**
       * move in SAN format
       */
      m: z.string(),
    })
  ),
});

const movesEntrySchema = z.object({
  adjudication: z.object({
    Draw: z.number(),
    FiftyMoves: z.number(),
    ResignOrWin: z.number(),
  }),
  book: z.boolean(),
  d: z.string().optional(),
  h: z.string().optional(),
  m: z.string().optional(),
  material: z.object({
    b: z.number(),
    n: z.number(),
    p: z.number(),
    q: z.number(),
    r: z.number(),
  }),
  mt: z.string().optional(),
  n: z.string().optional(),
  // this is the only one that was optional but whatever
  pd: z.string().optional(),
  ph: z.string().optional(),
  s: z.string().optional(),
  sd: z.string().optional(),
  tb: z.string().optional(),
  tl: z.string().optional(),
  to: z.string().optional(),
  wv: z.string().optional(),
  fen: z.string(),

  pv: pvSchema,
});

export const socketPgnSchema = z.object({
  gameChanged: z.number(),
  lastMoveLoaded: z.number(),
  numMovesToSend: z.number(),

  Round: z.number(),
  Users: z.number(),

  WhiteEngineOptions: z.array(engineOptionsSchema),
  BlackEngineOptions: z.array(engineOptionsSchema),

  Headers: z.record(z.string(), z.string()),
  Moves: z.array(movesEntrySchema),

  totalSent: z.number().optional(),
});
