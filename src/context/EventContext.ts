import { create } from "zustand";
import type {
  CCCEventsListUpdate,
  CCCEventUpdate,
  CCCGameUpdate,
  _Nullish,
  CCCEngine,
} from "../types";
import { zustandHmrFix } from "./ZustandHMRFix";

type RequestEventFn = (gameNr?: string, eventNr?: string) => void;

type EventContext = _Nullish<{
  cccEventList: CCCEventsListUpdate;
  cccEvent: CCCEventUpdate;
  cccGame: CCCGameUpdate;
  engines: CCCEngine[];

  setEventList: (eventList: CCCEventsListUpdate) => void;
  setGame: (game: CCCGameUpdate) => void;
  setEvent: (cccEvent: CCCEventUpdate) => void;
  updateCCCEngines: () => void;
}> & {
  requestEvent: RequestEventFn;
  setRequestEvent: (fn: RequestEventFn) => void;
};

export const useEventStore = create<EventContext>((set, get) => {
  return {
    cccEvent: null,
    cccGame: null,
    cccEventList: null,
    engines: [],

    setEvent: (cccEvent) => {
      if (cccEvent === null) {
        return;
      }

      let eventUpdated = false;

      set((state) => {
        // checks below needed to prevent unnecessary state updates
        // that would trigger re-renders on all state subs

        const prevTournamentLen: number =
          state.cccEvent?.tournamentDetails.schedule.past.length || -1;
        const incomingTournamentLen: number =
          cccEvent.tournamentDetails.schedule.past.length || -1;

        const prevTournamentName: string =
          state.cccEvent?.tournamentDetails.name || "_A";
        const incomingTournamentName: string =
          cccEvent.tournamentDetails.name || "_A";

        const tournamentDidUpdate =
          prevTournamentLen !== incomingTournamentLen ||
          prevTournamentName !== incomingTournamentName;

        if (!tournamentDidUpdate) {
          return state;
        }

        eventUpdated = true;

        return { cccEvent };
      });

      if (eventUpdated) {
        // recalculate engine standings as a side effect
        get().updateCCCEngines(null);
      }
    },
    setGame: (game) => {
      if (game === null) {
        return;
      }

      set({ cccGame: game });
    },
    setEventList: (eventList) => {
      if (eventList === null) {
        return;
      }

      set((state) => {
        if (state.cccEventList === null) {
          return { cccEventList: eventList };
        }

        const eventListChangedLength =
          state.cccEventList.events.length !== eventList.events.length;

        if (eventListChangedLength) {
          return { cccEventList: eventList };
        }

        return state;
      });
    },
    updateCCCEngines() {
      set((state) => {
        const event = state.cccEvent;
        if (!event?.tournamentDetails?.engines) {
          return state;
        }

        const updatedEngines: CCCEngine[] = calculateNewEngineStandings(event);

        return { engines: updatedEngines };
      });
    },

    //
    requestEvent: () => {},
    setRequestEvent(fn) {
      set({ requestEvent: fn });
    },
  };
});

function calculateNewEngineStandings(event: CCCEventUpdate): CCCEngine[] {
  const updatedEngines = event.tournamentDetails.engines
    .map((engine) => {
      const playedGames = event.tournamentDetails.schedule.past.filter(
        (game) => game.blackId === engine.id || game.whiteId === engine.id
      );
      const points = playedGames.reduce((prev, cur) => {
        if (cur.blackId === engine.id) {
          switch (cur.outcome) {
            case "1-0":
              return prev + 0.0;
            case "0-1":
              return prev + 1.0;
            case "1/2-1/2":
              return prev + 0.5;
            default:
              return prev;
          }
        } else {
          switch (cur.outcome) {
            case "0-1":
              return prev + 0.0;
            case "1-0":
              return prev + 1.0;
            case "1/2-1/2":
              return prev + 0.5;
            default:
              return prev;
          }
        }
      }, 0);
      const perf = (100 * points) / playedGames.length;
      return {
        ...engine,
        perf: perf.toFixed(1),
        points: points.toFixed(1),
        playedGames: playedGames.length.toFixed(1),
      };
    })
    .sort((a, b) => Number(b.perf) - Number(a.perf));

  return updatedEngines;
}

zustandHmrFix("eventContext", useEventStore);
