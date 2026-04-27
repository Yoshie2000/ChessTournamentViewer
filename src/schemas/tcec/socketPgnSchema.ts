import z from "zod";

const engineOptionsSchema = z.object({ Name: z.string(), Value: z.string() });

const movesEntrySchema = z.object({
  adjudication: z.object({
    Draw: z.number(),
    FiftyMoves: z.number(),
    ResignOrWin: z.number(),
  }),
  book: z.boolean(),
  material: z.object({
    b: z.number(),
    n: z.number(),
    p: z.number(),
    q: z.number(),
    r: z.number(),
  }),
  mt: z.string(),
  /**
   * nps
   */
  n: z.string(),
  ph: z.string(),
  // "pd" is verified optional
  pd: z.string().optional(),
  // "s", "sd", "tb", "d", "h" and "tl"
  // further verification needed for the correctness of .optional()
  s: z.string().optional(),
  sd: z.string().optional(),
  tb: z.string().optional(),
  tl: z.string().optional(),
  d: z.string().optional(),
  h: z.string().optional(),
  /**
   * single square on a chessboard
   *
   * @example "h3", "e4", "d6"
   */
  to: z.string(),
  /**
   * single square on a chessboard
   *
   * @example "h3", "e4", "d6"
   */
  m: z.string(),
  wv: z.string(),
  fen: z.string(),

  pv: z.object({
    San: z.string(),
    Moves: z.array(
      z.object({
        fen: z.string(),
        /**
         * just square
         *
         * @example "a6", "d5"
         */
        from: z.string(),
        /**
         * just square
         *
         * @example "a6", "d5"
         */
        to: z.string(),
        /**
         * move in SAN format
         */
        m: z.string(),
      })
    ),
  }),
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
