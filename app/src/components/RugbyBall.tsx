export function RugbyBall({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <ellipse
        cx="32"
        cy="20"
        rx="30"
        ry="18"
        fill="currentColor"
        opacity="0.16"
      />
      <ellipse
        cx="32"
        cy="20"
        rx="30"
        ry="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M32 4c6 6 9 11 9 16s-3 10-9 16c-6-6-9-11-9-16s3-10 9-16z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path d="M32 8v24" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <path d="M27 13.5h10M25 20h14M27 26.5h10" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    </svg>
  );
}

/**
 * The Rugbydex mark: a rugby ball in the house gradient circle.
 *
 * The ball spins on hover, exactly like Footballdex's ball and the
 * DepotChargeDex bolt. The rotation is on the SVG, not on the gradient
 * circle, so the badge keeps its shape while the ball turns.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full bg-gradient-to-br from-turf to-turf-dark text-pitch-950 ${className}`}>
      <RugbyBall className="h-4 w-5 transition-transform duration-300 group-hover:rotate-180" />
    </span>
  );
}
