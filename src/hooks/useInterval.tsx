import { useEffect } from "react";
import { useLiveInfo } from "../context/LiveInfoContext";

const MAX_UPDATE_INTERVAL_MS = 100;

export function useInterval(
  callback: (state: ReturnType<typeof useLiveInfo.getState>) => void
) {
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useLiveInfo.getState();
      callback(state);
    }, MAX_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
