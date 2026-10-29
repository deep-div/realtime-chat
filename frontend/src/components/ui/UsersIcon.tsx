interface UsersIconProps {
  className?: string;
}

export function UsersIcon({ className }: UsersIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M2.5 19a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15.5 6.2a3 3 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 13.3a6.5 6.5 0 0 1 4.5 5.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
