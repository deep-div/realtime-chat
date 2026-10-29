interface ChatBubbleIconProps {
  className?: string;
}

export function ChatBubbleIcon({ className }: ChatBubbleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 12a8 8 0 1 1 3.2 6.4L4 19l1.1-3A7.96 7.96 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10.5h7M8.5 13.5h4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
