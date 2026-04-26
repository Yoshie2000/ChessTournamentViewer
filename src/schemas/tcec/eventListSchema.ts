import z from "zod";

const subEventDataSchema = z.object({
  /**
   * @example "TCEC_Season_29_-_League_1"
   */
  abb: z.string(),
  /**
   * looks like a random string
   *
   * @example "1", "2", "sf", "E"
   */
  dno: z.string(),
  /**
   * @example "s1divisionsf"
   */
  id: z.string(),
  /**
   * @example "Division 2", "Superfinal"
   */
  menu: z.string(),
  /**
   * Number of a season/cup in a sting format
   *
   */
  no: z.string(),
  /**
   * @example "season=1&div=sf"
   */
  url: z.string(),
});

const seasonSchemaBase = z.object({
  /**
   * @example "TCEC_Season_25_full.pgn.zip", "TCEC_Cup_12_full.pgn.zip"
   */
  download: z.string(),
  sub: z.array(subEventDataSchema),
});

const seasonEventsSchema = z
  .object({
    /**
     * set to `1` if present. Why.
     */
    proceed: z.number().optional(),
    frc: z.number().optional(),
    fullpgn: z.string().optional(),
  })
  .and(seasonSchemaBase);

const cupEventsSchema = z
  .object({
    seasonName: z.string(),
    /**
     * @example "TCEC_Cup_10_event"
     */
    eventtag: z.string(),
    /**
     * literally cap number, for `cup_1` is set to  `1`
     */
    cup: z.number(),
    /**
     * @example "cup12.json", "cup13.json"
     */
    teams: z.string(),

    /**
     * i don't know what it does
     *
     * @example for `eventtag = "TCEC_Cup_16_event"` it is equal to `TCEC_Cup_16_Round32`
     */
    previouspgn: z.string().optional(),
  })
  .and(seasonSchemaBase);

export const eventListSchema = z.object({
  Seasons: z.record(
    z.string(),
    z.union([seasonEventsSchema, cupEventsSchema, seasonSchemaBase])
  ),
});
