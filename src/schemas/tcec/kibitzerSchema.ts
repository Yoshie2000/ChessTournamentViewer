import z from "zod";

const evalSchema = z.object({
  depth: z.string(),
  eval: z.number(),
  nodes: z.number(),
  pv: z.string(),
  speed: z.string(),
  tbhits: z.number(),
  wdl: z.string(),
});

export const kibitzerSchema = z.object({
  desc: z.string(),
  engine: z.string(),
  gameno: z.number(),
  rount: z.number(),
  moves: z.array(evalSchema),
});
