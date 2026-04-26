import type z from "zod";
import type {
  CCCClocksSchema,
  CCCEngineSchema,
  CCCEventListUpdateSchema,
  CCCEventSchema,
  CCCEventUpdateSchema,
  CCCGameSchema,
  CCCGameUpdateSchema,
  CCCKibitzerSchema,
  CCCLiveInfoSchema,
  CCCNewMoveSchema,
  CCCResultSchema,
  CCCTimeControlSchema,
} from "./schemas/ccc/cccMessageSchema";

type TimeControl = z.infer<typeof CCCTimeControlSchema>;

type CCCEngine = z.infer<typeof CCCEngineSchema>;
type CCCGame = z.infer<typeof CCCGameSchema>;
type CCCEventUpdate = z.infer<typeof CCCEventUpdateSchema>;
type CCCGameUpdate = z.infer<typeof CCCGameUpdateSchema>;
type CCCClocks = z.infer<typeof CCCClocksSchema>;
type CCCLiveInfo = z.infer<typeof CCCLiveInfoSchema>;
type CCCNewMove = z.infer<typeof CCCNewMoveSchema>;
type CCCEvent = z.infer<typeof CCCEventSchema>;
type CCCEventsListUpdate = z.infer<typeof CCCEventListUpdateSchema>;
type CCCResult = z.infer<typeof CCCResultSchema>;
type CCCKibitzer = z.infer<typeof CCCKibitzerSchema>;

export type CCCMessage =
  | CCCLiveInfo
  | CCCNewMove
  | CCCClocks
  | CCCEventUpdate
  | CCCGameUpdate
  | CCCEventsListUpdate
  | CCCResult
  | CCCKibitzer;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Makes all properties of T nullable, and for function properties,
 * makes their parameters nullable while preserving the return type.
 *
 * @example
 * type User = { name: string; greet: (name: string) => string; }
 * type NullishUser = _Nullish<User> // { name: string | null; greet: (args: string | null) => string; }
 */
export type _Nullish<T extends object> = {
  [K in keyof T]: T[K] extends (arg: infer Params) => infer Return
    ? (args: Params | null) => Return
    : T[K] | null;
};
