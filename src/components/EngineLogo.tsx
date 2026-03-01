import type { CCCEngine } from "../types";
import "./EngineLogo.css";

type EngineLogoProps = { engine?: CCCEngine; size?: number };

function getImageUrl(engine?: CCCEngine) {
  let imgSrc = "";
  if (engine?.imageUrl.includes("https")) {
    imgSrc = engine.imageUrl;
  } else if (window.location.search.includes("tcec")) {
    imgSrc = "https://ctv.yoshie2000.de/tcec/image/tcec2.jpg";
  } else if (engine?.imageUrl) {
    imgSrc =
      "https://images.chesscomfiles.com/chess-themes/computer_chess_championship/avatars/" +
      engine.imageUrl +
      ".png";
  }

  return imgSrc;
}

export function EngineLogo({ engine, size = 36 }: EngineLogoProps) {
  const src = getImageUrl(engine);

  return (
    <img
      src={src}
      style={{
        width: `${size}px`,
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
