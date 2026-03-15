import { useCallback, useEffect } from "react";
import { useLiveInfo } from "../context/LiveInfoContext";

const CLOCK_UPDATE_MS = 100;

export const useClocks = () => {
  const setClocks = useLiveInfo((state) => state.setClocks);
  const game = useLiveInfo((state) => state.game);

  const updateClocks = useCallback(() => {
    const result = game.getHeaders()["Result"];
    if (result && result !== "*") return;

    setClocks((color, timeLeft) => {
      if (color.startsWith(game.turn())) return timeLeft - CLOCK_UPDATE_MS;
      return timeLeft;
    });
  }, [game, setClocks]);

  useEffect(() => {
    const clockTimer = setInterval(updateClocks, CLOCK_UPDATE_MS);
    return () => clearInterval(clockTimer);
  }, [updateClocks]);
};
