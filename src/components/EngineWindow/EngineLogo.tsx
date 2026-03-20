import type { CCCEngine } from "../../types";
import { useEventStore } from "../../context/EventContext";
import "./EngineLogo.css";

type EngineLogoProps = { engine?: CCCEngine; size?: number };

function getImageUrl(
  engine: CCCEngine | undefined,
  provider: "ccc" | "tcec"
): string {
  if (engine?.imageUrl.includes("https")) {
    return engine.imageUrl;
  }

  if (provider === "tcec") {
    if (engine?.imageUrl) {
      const engineName = `${engine.imageUrl[0].toUpperCase()}${engine.imageUrl.slice(1).toLowerCase()}`;
      return `https://ctv.yoshie2000.de/tcec/image/engine/${engineName}.png`;
    }

    return "https://ctv.yoshie2000.de/tcec/image/tcec2.jpg";
  }

  if (engine?.imageUrl) {
    return `https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/${engine.imageUrl}.png`;
  }

  return "https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/heimdall.png";
}

export function EngineLogo({ engine, size = 36 }: EngineLogoProps) {
  const activeProvider = useEventStore((state) => state.activeProvider);
  const src = getImageUrl(engine, activeProvider);

  return (
    <img
      src={src}
      style={{
        width: `${size * (activeProvider === "tcec" ? 1.5 : 1)}px`,
        height: `${size}px`,
        margin: `${size / 6}px`,
      }}
      className="engineLogo"
      onError={(event) => {
        // Safe fallback that will never change
        (event.target as HTMLImageElement).src =
          "https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/heimdall.png";
      }}
    />
  );
}
