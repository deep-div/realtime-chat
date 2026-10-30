interface SmileIconProps {
  className?: string;
}

export function SmileIcon({ className }: SmileIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="10" r="1.25" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.25" fill="currentColor" />
      <path
        d="M8 14.5c1 1.5 2.5 2.25 4 2.25s3-.75 4-2.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
