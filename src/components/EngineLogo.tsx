import type { CCCEngine } from "../types";
import "./EngineLogo.css";

type EngineLogoProps = { engine: CCCEngine; size?: number };

export function EngineLogo({ engine, size = 36 }: EngineLogoProps) {
  const src = engine.imageUrl.includes("https")
    ? engine.imageUrl
    : "https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/" +
      engine.imageUrl +
      ".png";

  return (
    <img
      src={src}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        margin: `${size / 6}px`,
      }}
      className="engineLogo"
    />
  );
}
