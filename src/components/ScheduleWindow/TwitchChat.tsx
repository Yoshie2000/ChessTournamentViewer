import { useEventStore } from "../../context/EventContext";

export function TwitchChat() {
  const activeProvider = useEventStore((state) => state.activeProvider);

  const twitchChannel =
    activeProvider === "ccc" ? "computerchess" : "TCEC_Chess_TV";

  return (
    <iframe
      src={`https://www.twitch.tv/embed/${twitchChannel}/chat?parent=staging.ctv.yoshie2000.de&parent=ctv.yoshie2000.de&darkpopout`}
      style={{ width: "100%", height: "100%" }}
      loading="lazy"
    />
  );
}
