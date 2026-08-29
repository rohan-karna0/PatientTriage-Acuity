type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  variant?: "default" | "light" | "mark-only";
  className?: string;
};

/** Acuity brand mark — pulse triage "A" */
export function Logo({
  size = 36,
  showWordmark = true,
  variant = "default",
  className = "",
}: LogoProps) {
  const gradId = `acuity-grad-${size}`;
  const textColor =
    variant === "light" ? "#ffffff" : variant === "default" ? "var(--text)" : "var(--brand)";
  const subColor = variant === "light" ? "rgba(255,255,255,0.75)" : "var(--text-muted)";

  return (
    <div className={`logo-wrap ${className}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="logo-mark"
      >
        <rect width="48" height="48" rx="12" fill={`url(#${gradId})`} />
        <path
          d="M14 34L24 12L34 34"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18 26H30" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M8 28H12M36 28H40"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10 28C12 24 14 22 18 22C22 22 24 26 28 26C32 26 34 24 38 20"
          stroke="#7dffc8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id={gradId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1b5e4a" />
            <stop offset="1" stopColor="#2a8f6e" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <div className="logo-text" style={{ lineHeight: 1.15 }}>
          <span
            style={{
              display: "block",
              fontSize: size * 0.5,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: textColor,
            }}
          >
            Acuity
          </span>
          <span
            style={{
              display: "block",
              fontSize: size * 0.28,
              fontWeight: 500,
              color: subColor,
              letterSpacing: "0.02em",
            }}
          >
            PatientTriage.ai
          </span>
        </div>
      )}
    </div>
  );
}
