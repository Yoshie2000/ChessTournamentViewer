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
  };
};

type CCCGameUpdate = {
  type: "gameUpdate";
  gameDetails: {
    gameNr: number;
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

type CCCEvent = { id: number; name: string; tc: TimeControl };

type CCCEventsListUpdate = { type: "eventsListUpdate"; events: CCCEvent[] };

type EngineWindowProps = {
  white?: CCCEngine;
  black?: CCCEngine;
  activeKibitzerInfo?: CCCEngine;

  latestLiveInfoWhite?: CCCLiveInfo;
  latestLiveInfoBlack?: CCCLiveInfo;
  latestLiveInfoKibitzer: CCCLiveInfo | undefined;
  clocks?: { wtime?: string; btime?: string };
};

export type CCCMessage =
  | CCCLiveInfo
  | CCCNewMove
  | CCCClocks
  | CCCEventUpdate
  | CCCGameUpdate
  | CCCEventsListUpdate;

