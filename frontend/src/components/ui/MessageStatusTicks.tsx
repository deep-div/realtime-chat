import type { ChatMessage } from "../../features/chat/types";

function SingleTick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 6.5L5 10.5L15 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleTick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 12" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 6.5L5 10.5L15 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6.5L10 10.5L19.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MessageStatusTicksProps {
  status: ChatMessage["localStatus"];
  className?: string;
}

/** Renders WhatsApp-style status ticks for a message you sent: single/double/blue-double. */
export function MessageStatusTicks({ status, className = "h-3.5 w-3.5" }: MessageStatusTicksProps) {
  if (status === "sending") {
    return <SingleTick className={`${className} opacity-40`} />;
  }
  if (status === "error") {
    return <span className={`text-[10px] leading-none text-red-300`}>!</span>;
  }
  if (status === "read") {
    return <DoubleTick className={`${className} text-sky-300`} />;
  }
  if (status === "delivered") {
    return <DoubleTick className={className} />;
  }
  // "sent" or unknown/undefined (e.g. a message loaded from history with no local status yet)
  return <SingleTick className={className} />;
}
