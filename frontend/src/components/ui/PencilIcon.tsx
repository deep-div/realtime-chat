interface PencilIconProps {
  className?: string;
}

export function PencilIcon({ className }: PencilIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19 3 20l1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
