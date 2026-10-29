interface VideoIconProps {
  className?: string;
}

export function VideoIcon({ className }: VideoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M15 10.5 20.2 7a.8.8 0 0 1 1.3.6v8.8a.8.8 0 0 1-1.3.6L15 13.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
