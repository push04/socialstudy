import React from "react";

type Props = {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  className?: string;
  trackClassName?: string;
};

export default function ProgressRing({ size = 220, stroke = 10, progress, className = "", trackClassName = "" }: Props){
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference - clamped * circumference;

  return (
    <svg width={size} height={size} className={className}>
      <g transform={`rotate(-90 ${size/2} ${size/2})`}>
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          strokeWidth={stroke}
          className={trackClassName || "text-white/15"}
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-white"
          stroke="currentColor"
          fill="transparent"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 200ms ease" }}
        />
      </g>
    </svg>
  );
}
