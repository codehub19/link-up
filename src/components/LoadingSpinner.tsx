// LoadingSpinner.tsx
import React from "react";
export default function LoadingSpinner({ size = 24, color = "#ffffff" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox="0 0 48 48" role="status" aria-label="Loading">
        <circle
          cx="24"
          cy="24"
          r="15"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="0"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 24 24"
            to="360 24 24"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </span>
  );
}