import type { GridStackWidget } from "gridstack";
import type { LiveInfoEntry } from "./LiveInfo";
import type { CCCEventUpdate, CCCGameUpdate } from "./types";
import { LAYOUTS, type Widget } from "./Layout";

const LIVE_INFO_PREFIX = "LI|";
const SETTINGS_PREFIX = "S|";
const LAYOUT_PREFIX = "G|";

export function saveLiveInfos(
  event: CCCEventUpdate,
  game: CCCGameUpdate,
  liveInfos: LiveInfoEntry[]
) {
  const eventId = event.tournamentDetails.tNr;
  const gameNr = Number(game.gameDetails.gameNr);
  if (!gameNr) return;

  const searchSuffix = `|${eventId}|${gameNr}`;
  const key = `${LIVE_INFO_PREFIX}${Date.now()}${searchSuffix}`;
  const value = JSON.stringify(liveInfos);

  try {
    deleteLiveInfosForGame(searchSuffix);
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === "QuotaExceededError") {
      const success = deleteOldLiveInfos(eventId);
      if (success) saveLiveInfos(event, game, liveInfos);
      else {
        console.error(
          "Could not free up old localstorage space. Removing all data except for the settings"
        );
        deleteAllButSettings();
      }
    }
  }
}

export function loadLiveInfos(
  event: CCCEventUpdate,
  game: CCCGameUpdate
): LiveInfoEntry[] {
  const eventId = event.tournamentDetails.tNr;
  const gameNr = Number(game.gameDetails.gameNr);
  if (!gameNr) return [];

  const searchSuffix = `|${eventId}|${gameNr}`;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);

    if (key && key.startsWith(LIVE_INFO_PREFIX) && key.endsWith(searchSuffix)) {
      const data = localStorage.getItem(key);
      const parsed = JSON.parse(data ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    }
  }

  return [];
}

export function loadSettings() {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SETTINGS_PREFIX)) {
      keys.push(key);
    }
  }

  const settings: Record<string, string | null> = {};
  for (const key of keys) {
    const value = localStorage.getItem(key);
    settings[key.slice(SETTINGS_PREFIX.length)] = value;
  }

  return settings;
}

export function saveSettings(settings: Record<string, any>) {
  const keys = Object.keys(settings);

  for (const key of keys) {
    localStorage.setItem(SETTINGS_PREFIX + key, String(settings[key]));
  }
}

export function saveLayout(breakpoint: number, layout: GridStackWidget[]) {
  localStorage.setItem(
    LAYOUT_PREFIX + String(breakpoint),
    JSON.stringify(layout)
  );
}

export function loadLayout(breakpoint: number) {
  const data = localStorage.getItem(LAYOUT_PREFIX + String(breakpoint));
  if (data) {
    const widgets = JSON.parse(data) as GridStackWidget[];
    return widgets
      .filter((widget) => !!widget.id)
      .map((widget) => ({
        id: widget.id!,
        w: widget.w ?? 1,
        h: widget.h ?? 1,
        x: widget.x ?? 0,
        y: widget.y ?? 0,
        component: LAYOUTS[Number(Object.keys(LAYOUTS)[0])].widgets.find(
          (w) => w.id === widget.id
        )!.component,
      })) satisfies Widget[];
  }
  return undefined;
}

export function resetLayouts() {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LAYOUT_PREFIX)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

function deleteAllButSettings() {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      !key.startsWith(SETTINGS_PREFIX) &&
      !key.startsWith(LAYOUT_PREFIX)
    ) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

function deleteOldLiveInfos(currentEventId: string): boolean {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LIVE_INFO_PREFIX)) {
      keys.push(key);
    }
  }

  if (keys.length === 0) return false;

  keys.sort((a, b) => {
    const timeA = parseInt(a.split("|")[1]);
    const timeB = parseInt(b.split("|")[1]);
    return timeA - timeB;
  });

  const differentEventKey = keys.find((k) => {
    const parts = k.split("|");
    return parts[2] !== currentEventId;
  });

  const keyToDelete = differentEventKey || keys[0];
  localStorage.removeItem(keyToDelete);

  console.warn(`Quota exceeded. Deleted old cache: ${keyToDelete}`);
  return true;
}

function deleteLiveInfosForGame(searchSuffix: string) {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LIVE_INFO_PREFIX) && key.endsWith(searchSuffix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
