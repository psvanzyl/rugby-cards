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

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full bg-gradient-to-br from-turf to-turf-dark text-pitch-950 ${className}`}>
      <RugbyBall className="h-4 w-5" />
    </span>
  );
}
