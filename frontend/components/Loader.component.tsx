"use client";

type Props = {
  message?: string;
  bg?: string;
  spinnerSize?: number;
};

export default function Loader({
  message = "Loading…",
  bg = "rgba(0,0,0,0.6)",
  spinnerSize = 50,
}: Props) {
  const size = spinnerSize;
  const stroke = Math.max(4, Math.round(size * 0.07));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="60%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#11182744"
            strokeWidth={stroke}
            fill="none"
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#g)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference * 0.75 + " " + circumference}
            style={{
              transformOrigin: "50% 50%",
              animation:
                "spin 1s linear infinite, dash 1.4s ease-in-out infinite",
            }}
          />
        </svg>

        <div
          style={{
            color: "white",
            fontSize: 14,
            textAlign: "center",
            opacity: 0.95,
            fontFamily:
              "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          }}
        >
          {message}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes dash {
          0% {
            stroke-dasharray: ${circumference * 0.1} ${circumference};
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: ${circumference * 0.75} ${circumference};
            stroke-dashoffset: -${circumference * 0.25};
          }
          100% {
            stroke-dasharray: ${circumference * 0.1} ${circumference};
            stroke-dashoffset: -${circumference * 0.9};
          }
        }
        @media (max-width: 420px) {
          svg {
            width: ${Math.max(72, Math.round(size * 0.6))}px;
            height: ${Math.max(72, Math.round(size * 0.6))}px;
          }
        }
      `}</style>
    </div>
  );
}
