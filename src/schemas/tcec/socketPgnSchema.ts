import z from "zod";

const engineOptionsSchema = z.object({ Name: z.string(), Value: z.string() });

/**
 * Single square on a chessboard
 *
 * @example "h3", "e4", "d6"
 */
const squareSchema = z.string();

const materialSchema = z.object({
  b: z.number(),
  n: z.number(),
  p: z.number(),
  q: z.number(),
  r: z.number(),
});

/** Fields that are always present */
const baseEntrySchema = z.object({
  material: materialSchema,
  fen: z.string(),
  to: squareSchema,
  m: squareSchema,
});

/** book: true */
const bookEntrySchema = baseEntrySchema.extend({
  book: z.literal(true),
  from: squareSchema,
});

/** book: false */
const engineEntrySchema = baseEntrySchema.extend({
  book: z.literal(false),

  adjudication: z.object({
    Draw: z.number(),
    FiftyMoves: z.number(),
    ResignOrWin: z.number(),
  }),

  /** move time */
  mt: z.string(),
  /** nodes */
  n: z.string(),
  ph: z.string(),
  // "pd" is verified optional
  pd: z.string().optional(),
  /** speed */
  s: z.string(),
  /** seldepth */
  sd: z.string(),
  /** tbhits */
  tb: z.string(),
  /** depth */
  d: z.string(),
  /** time left */
  tl: z.string().optional(),
  /** hashful */
  h: z.string().optional(),
  wv: z.string(),

  pv: z.object({
    San: z.string(),
    Moves: z.array(
      z.object({
        fen: z.string(),
        from: squareSchema,
        to: squareSchema,
        /** Move in SAN format */
        m: z.string(),
      })
    ),
  }),
});

export const movesEntrySchema = z.discriminatedUnion("book", [
  bookEntrySchema,
  engineEntrySchema,
]);

export type MoveEntry = z.infer<typeof movesEntrySchema>;
export type BookMoveEntry = z.infer<typeof bookEntrySchema>;
export type EngineMoveEntry = z.infer<typeof engineEntrySchema>;

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
