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
  /**
   * @todo add description
   */
  mt: z.string(),
  /**
   * nodes
   */
  n: z.string(),
  ph: z.string(),
  // "pd" is verified optional
  pd: z.string().optional(),

  /**
   * speed
   */
  s: z.string(),
  /**
   * seldepth
   */
  sd: z.string(),
  /**
   * tbhits
   */
  tb: z.string(),
  /**
   * depth
   */
  d: z.string(),

  // "h" and "tl": further verification needed for the correctness of .optional()

  /**
   * @todo add description
   */
  tl: z.string().optional(),
  /**
   * hashful
   */
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
