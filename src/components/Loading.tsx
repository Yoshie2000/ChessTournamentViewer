import "./Loading.css";

export function SkeletonBlock({
  width,
  height,
  style,
  className,
}: {
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={{ width, height, ...style }}
      className={"sk-block" + (className ? " " + className : "")}
    />
  );
}

export function SkeletonText({
  width,
  height = "1rem",
  style,
  className,
}: {
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={{ width, height, ...style }}
      className={"sk-block" + (className ? " " + className : "")}
    />
  );
}

export function Spinner({
  size = 24,
  thickness = 3,
  style,
  className,
}: {
  size?: number;
  thickness?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={"sk-spinner" + (className ? " " + className : "")}
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
        ...style,
      }}
    />
  );
}
