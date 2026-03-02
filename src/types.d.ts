type TimeControl = { init: number; incr: number };

type CCCEngine = {
  authors: string;
  config: {
    command: string;
    timemargin: number;
    options: Record<string, string | number>;
  };
  country: string;
  elo: string;
  facts: string;
  flag: string;
  id: string;
  imageUrl: string;
  name: string;
  perf: string;
  playedGames: string;
  points: string;
  rating: string;
  updatedAt: string;
  version: string;
  website: string;
  year: string;
};

type CCCGame = {
  blackId: string;
  blackName: string;
  estimatedStartTime: unknown;
  gameNr: string;
  matchNr: string;
  opening: string;
  openingType: string;
  outcome?: string;
  roundNr: string;
  timeControl: string;
  timeStart?: string;
  timeEnd?: string;
  variant: string;
  whiteId: string;
  whiteName: string;
};

type CCCEventUpdate = {
  type: "eventUpdate";
  tournamentDetails: {
    name: string;
    tNr: string;
    tc: TimeControl;
    schedule: { past: CCCGame[]; present?: CCCGame; future: CCCGame[] };
    engines: CCCEngine[];
    hasGamePairs: boolean;
    isRoundRobin: boolean;
  };
};

type CCCGameUpdate = {
  type: "gameUpdate";
  gameDetails: {
    gameNr: string;
    live: boolean;
    opening: string;
    pgn: string;
    termination?: string;
  };
};

type CCCClocks = {
  type: "clocks";
  binc: string;
  btime: string;
  winc: string;
  wtime: string;
};

type CCCLiveInfo = {
  type: "liveInfo";
  info: {
    color: string;
    depth: string;
    hashfull: string;
    multipv: string;
    name: string;
    nodes: string;
    ply: number;
    pv: string;
    pvSan: string;
    score: string;
    seldepth: string;
    speed: string;
    tbhits: string;
    time: string;
  };
};

type CCCNewMove = {
  type: "newMove";
  move: string;
  times: { w: number; b: number };
};

type CCCEvent = { id: string; name: string; tc?: TimeControl };

type CCCEventsListUpdate = { type: "eventsListUpdate"; events: CCCEvent[] };

type CCCResult = {
  type: "result";
  reason: string;
  score: string;
  whiteName: string;
  blackName;
};

type CCCKibitzer = { type: "kibitzer"; engine: CCCEngine; color: string };

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
