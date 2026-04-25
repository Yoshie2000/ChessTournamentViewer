import z from "zod";

// TODO:
const matchResult = z.enum(["1/2-1/2", "*"]);
const termination = z.enum([
  "3-Fold repetition",
  "TCEC draw rule",
  "in progress",
]);
const roomType = z.enum(["roomall"]); // can be other value??
export const htmlReadSchema = z.strictObject({
  room: roomType,
  data: z.string(),
});

/// schema 1
const futureGameSchema = z.object({
  Black: z.string(),
  White: z.string(),
  Game: z.number(),
});

const currentGameSchema = z
  .object({
    Result: matchResult,
    Termination: termination,
    Start:
      // "07:40:31 on 2026.04.25"
      z.string(),
  })
  .and(futureGameSchema);

const pastGameSchema = z
  .object({
    WhiteEv: z.string(),
    BlackEv: z.string(),

    Duration: z.string(),
    FinalFen: z.string(),

    Moves: z.number(),
  })
  .and(currentGameSchema);

const gameUnion = z.union([
  futureGameSchema,
  currentGameSchema,
  pastGameSchema,
]);

export const responseSchedule = z.array(gameUnion);
