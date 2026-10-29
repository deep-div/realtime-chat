interface PhoneIconProps {
  className?: string;
}

export function PhoneIcon({ className }: PhoneIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 4.5h3.2l1.3 4-2 1.3a11.2 11.2 0 0 0 4.7 4.7l1.3-2 4 1.3V17c0 1.1-.9 2-2 2A14.5 14.5 0 0 1 3 5.5c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
