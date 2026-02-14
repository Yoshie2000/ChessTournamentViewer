import type { CCCEngine } from "../types";
import "./EngineLogo.css";

type EngineLogoProps = { engine: CCCEngine, size?: number };

export function EngineLogo({ engine, size = 36 }: EngineLogoProps) {
  return (
    <img
      src={
        "https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/" +
        engine.imageUrl +
        ".png"
      }
      style={{
          width: `${size}px`,
          height: `${size}px`,
          margin: `${size / 6}px`,
      }}
      className="engineLogo"
    />
  );
}
