import z from "zod";

const matchResult = z.enum(["1/2-1/2", "1-0", "0-1", "*"]);
// TODO:
// const termination = z.enum([
//   "3-Fold repetition",
//   "TCEC draw rule",
//   "in progress",
//   "White mates",
//   "Black mates",
//   "Fifty moves rule",
// ]);
const roomType = z.enum(["roomall"]); // can be other value??
export const htmlReadSchema = z.object({ room: roomType, data: z.string() });

/// schema 1
const futureGameSchema = z.object({
  Black: z.string(),
  White: z.string(),
  Game: z.number(),
});

const currentGameSchema = z
  .object({
    Result: matchResult,
    // Termination: termination,
    Termination: z.string(),
    Start: z.string(),
  })
  .and(futureGameSchema);

const pastGameSchema = z
  .object({
    WhiteEv: z.string(),
    BlackEv: z.string(),

    Duration: z.string(),
    FinalFen: z.string().optional(),

    Moves: z.number(),
    Opening: z.string(),

    ECO: z.string().optional(),
    RMobilityResult: z.string().optional(),
    worked: z.number().optional(),
  })
  .and(currentGameSchema);

const gameUnion = z.union([
  pastGameSchema,
  currentGameSchema,
  futureGameSchema,
]);

export const scheduleSchema = z.array(gameUnion);
