import { useEventStore } from "../../context/EventContext";

export function TwitchChat() {
  const activeProvider = useEventStore((state) => state.activeProvider);

  const domain = location.hostname;
  const twitchChannel =
    activeProvider === "ccc" ? "computerchess" : "TCEC_Chess_TV";

  console.log(
    "https://www.twitch.tv/embed/TCEC_Chess_TV/chat?parent=staging.ctv.yoshie2000.de&darkpopout",
    `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${domain}&darkpopout`
  );

  return (
    <iframe
      src={`https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${domain}&darkpopout`}
      style={{ width: "100%", height: "100%" }}
      loading="lazy"
    />
  );
}
