import { create } from "zustand";
import type {
  CCCEventsListUpdate,
  CCCEventUpdate,
  CCCGameUpdate,
  Nullish,
} from "../types";

type EventContext = Nullish<{
  cccEventList: CCCEventsListUpdate;
  cccEvent: CCCEventUpdate;
  cccGame: CCCGameUpdate;

  setEventList: (eventList: CCCEventsListUpdate) => void;
  setGame: (game: CCCGameUpdate) => void;
  setEvent: (cccEvent: CCCEventUpdate) => void;
}>;

export const useEventStore = create<EventContext>((set) => {
  return {
    cccEvent: null,
    cccGame: null,
    cccEventList: null,

    setEvent: (cccEvent) => {
      if (cccEvent === null) {
        return;
      }

      set((state) => {
        // checks below needed to prevent unnecessary state updates
        // that would trigger re-renders on all state subs

        const prevTournamentLen: number =
          state.cccEvent?.tournamentDetails.schedule.past.length || -1;
        const incomingTournamentLen: number =
          cccEvent.tournamentDetails.schedule.past.length || -2;

        const prevTournamentName: string =
          state.cccEvent?.tournamentDetails.name || "_A";
        const incomingTournamentName: string =
          cccEvent.tournamentDetails.name || "_B";

        const tournamentDidUpdate =
          prevTournamentLen !== incomingTournamentLen ||
          prevTournamentName !== incomingTournamentName;

        if (!tournamentDidUpdate) {
          return state;
        }

        return { cccEvent };
      });
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
  };
});
