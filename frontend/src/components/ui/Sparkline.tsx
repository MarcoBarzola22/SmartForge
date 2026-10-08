import * as React from "react";
import { cn } from "cn";

export interface SparklineProps {
  data?: number[];
  className?: string;
  width?: number;
  height?: number;
  color?: string;
  id?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data = [84.2, 83.9, 84.1, 83.6, 83.4, 83.5, 83.0, 82.7],
  className = "",
  width = 300,
  height = 64,
  color = "text-success",
  id = "spark",
}) => {
  if (!data || data.length < 2) {
    return null;
  }

  const W = width;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;

  const pts: [number, number][] = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 6 - ((v - min) / range) * (H - 12),
  ]);

  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-16 w-full select-none", color, className)}
      preserveAspectRatio="none"
      data-testid="sparkline-svg"
      role="img"
      aria-label="Gráfico de tendencia"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {last && (
        <circle cx={last[0]} cy={last[1]} r="4" fill="currentColor" data-testid="sparkline-anchor" />
      )}
    </svg>
  );
};

export default Sparkline;
