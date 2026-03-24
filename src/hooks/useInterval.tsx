import { useEffect } from "react";
import { useLiveInfo } from "../context/LiveInfoContext";
import { useSettings } from "../context/SettingsContext";

const MAX_UPDATE_INTERVAL_MS = 100;

export function useInterval(
  callback: (state: ReturnType<typeof useLiveInfo.getState>) => void
) {
  const freezeUpdates = useSettings((state) => state.freezeUpdates);

  useEffect(() => {
    if (freezeUpdates) return;

    const interval = setInterval(() => {
      const state = useLiveInfo.getState();
      callback(state);
    }, MAX_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [freezeUpdates]);
}
