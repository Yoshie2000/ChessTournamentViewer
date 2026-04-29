import z from "zod";

export const liveInfoSchema = z.object({
  depth: z.string(),
  eval: z.number(),
  nodes: z.number(),
  pv: z.string(),
  speed: z.string(),
  tbhits: z.number(),
});
