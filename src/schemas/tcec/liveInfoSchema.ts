import z from "zod";

export const liveInfoSchema = z.object({
  depth: z.string(),
  eval: z.union([z.number(), z.string()]),
  nodes: z.number(),
  pv: z.string(),
  speed: z.string(),
  tbhits: z.number(),
});
