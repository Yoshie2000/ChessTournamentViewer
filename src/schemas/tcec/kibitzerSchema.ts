import z from "zod";

const evalSchema = z.strictObject({
  depth: z.string(),
  eval: z.union([z.number(), z.string()]),
  nodes: z.number(),
  pv: z.string(),
  speed: z.string(),
  tbhits: z.number(),
  wdl: z.string().optional(),
});

export const kibitzerSchema = z.strictObject({
  desc: z.string().nullish(),
  engine: z.string().nullish(),
  gameno: z.number().nullish(),
  round: z.number().nullish(),
  moves: z.array(evalSchema).optional(),
});
