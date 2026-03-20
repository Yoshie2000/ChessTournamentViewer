import { create } from "zustand";
import type {
  CCCEventsListUpdate,
  CCCEventUpdate,
  CCCGameUpdate,
  CCCEngine,
} from "../types";
import { zustandHmrFix } from "./ZustandHMRFix";

export type ProviderKey = "ccc" | "tcec";

export const PROVIDERS: Record<ProviderKey, { label: string }> = {
  ccc: { label: "CCC" },
  tcec: { label: "TCEC" },
};

type RequestEventFn = (gameNr?: string, eventNr?: string) => void;

type ProviderState = {
  eventList: CCCEventsListUpdate | null;
  selectedEvent: CCCEventUpdate | null;
};

type EventContext = {
  activeProvider: ProviderKey;
  setActiveProvider: (provider: ProviderKey) => void;

  providerData: Record<ProviderKey, ProviderState>;

  activeEvent: CCCEventUpdate | null;
  activeEventList: CCCEventsListUpdate | null;

  activeGame: CCCGameUpdate | null;
  engines: CCCEngine[];

  pendingEventId: string | null;
  setPendingEventId: (id: string | null) => void;

  setEventList: (provider: ProviderKey, eventList: CCCEventsListUpdate) => void;
  setGame: (game: CCCGameUpdate) => void;
  setEvent: (provider: ProviderKey, event: CCCEventUpdate) => void;
  updateCCCEngines: () => void;

  requestEvent: RequestEventFn;
  setRequestEvent: (fn: RequestEventFn) => void;
};

const _emptyProviderData: Record<ProviderKey, ProviderState> = {
  ccc: { eventList: null, selectedEvent: null },
  tcec: { eventList: null, selectedEvent: null },
};

const _initialProvider: ProviderKey = window.location.search.includes("tcec")
  ? "tcec"
  : "ccc";

export const useEventStore = create<EventContext>((set, get) => {
  return {
    activeProvider: _initialProvider,
    providerData: _emptyProviderData,

    activeEvent: null,
    activeEventList: null,

    activeGame: null,
    engines: [],

    pendingEventId: null,
    setPendingEventId: (id) => set({ pendingEventId: id }),
    setActiveProvider(provider) {
      const { providerData } = get();
      const activeEvent = providerData[provider].selectedEvent;
      const activeEventList = providerData[provider].eventList;

      writeStateToUrl(provider, activeEvent?.tournamentDetails.tNr);
      set({ activeProvider: provider, activeEvent, activeEventList });

      if (activeEvent) {
        get().updateCCCEngines();
      }
    },

    setEventList(provider, eventList) {
      if (!eventList) return;

      set((state) => {
        const prev = state.providerData[provider].eventList;
        const lengthChanged =
          prev === null || prev.events.length !== eventList.events.length;

        if (!lengthChanged) return state;

        const newProviderData = {
          ...state.providerData,
          [provider]: { ...state.providerData[provider], eventList },
        };

        const isActive = provider === state.activeProvider;
        return {
          providerData: newProviderData,
          ...(isActive && { activeEventList: eventList }),
        };
      });
    },

    setEvent(provider, event) {
      if (!event) return;

      let eventUpdated = false;

      set((state) => {
        const prevEvent = state.providerData[provider].selectedEvent;

        const prevLen = prevEvent?.tournamentDetails.schedule.past.length ?? -1;
        const nextLen = event.tournamentDetails.schedule.past.length ?? -1;
        const prevName = prevEvent?.tournamentDetails.name ?? "_A";
        const nextName = event.tournamentDetails.name ?? "_A";

        if (prevLen === nextLen && prevName === nextName) return state;

        eventUpdated = true;

        const newProviderData = {
          ...state.providerData,
          [provider]: { ...state.providerData[provider], selectedEvent: event },
        };

        const isActive = provider === state.activeProvider;

        writeStateToUrl(
          state.activeProvider,
          isActive
            ? event.tournamentDetails.tNr
            : state.activeEvent?.tournamentDetails.tNr
        );

        return {
          providerData: newProviderData,
          ...(isActive && { activeEvent: event }),
        };
      });

      if (eventUpdated) {
        // recalculate engine standings as a side effect
        get().updateCCCEngines();
      }
    },

    setGame: (game) => {
      if (game === null) {
        return;
      }

      set((state) => {
        writeStateToUrl(
          state.activeProvider,
          state.activeEvent?.tournamentDetails.tNr,
          game.gameDetails.gameNr
        );
        return { activeGame: game, pendingEventId: null };
      });
    },

    updateCCCEngines() {
      set((state) => {
        const event = state.activeEvent;
        if (!event?.tournamentDetails?.engines) return state;
        return { engines: calculateNewEngineStandings(event) };
      });
    },

    requestEvent: () => {},
    setRequestEvent(fn) {
      set({
        requestEvent: (gameNr, eventNr) => {
          fn(gameNr, eventNr);
        },
      });
    },
  };
});

function writeStateToUrl(
  provider: ProviderKey,
  eventId?: string,
  gameId?: string
) {
  const url = new URL(location.href);

  url.searchParams.set("provider", provider);
  if (eventId) url.searchParams.set("event", eventId);
  else url.searchParams.delete("event");
  if (gameId) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");

  const newHref = url.toString();
  if (newHref !== location.href) window.history.replaceState(null, "", newHref);
}

function calculateNewEngineStandings(event: CCCEventUpdate): CCCEngine[] {
  return event.tournamentDetails.engines
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
        perf: (perf || 0).toFixed(1),
        points: points.toFixed(1),
        playedGames: playedGames.length.toFixed(1),
      };
    })
    .sort((a, b) => Number(b.perf) - Number(a.perf));
}

zustandHmrFix("eventContext", useEventStore);
