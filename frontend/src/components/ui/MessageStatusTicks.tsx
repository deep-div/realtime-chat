import type { ChatMessage } from "../../features/chat/types";

/** WhatsApp's "read" tick blue — kept as a fixed color so it pops regardless of bubble color. */
const READ_TICK_COLOR = "#53bdeb";

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6 3.2V6l2 1.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SingleTick({ className = "", color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 16 11" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.5 5.7L5.2 9.5L14.5 1"
        stroke={color ?? "currentColor"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleTick({ className = "", color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 18 11" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 5.7L4.7 9.5L14 1"
        stroke={color ?? "currentColor"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.3 5.7L9 9.5L17 1"
        stroke={color ?? "currentColor"}
        strokeWidth="1.4"
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

/** Renders WhatsApp-style status ticks for a message you sent: clock/single/double/blue-double. */
export function MessageStatusTicks({ status, className = "h-3.5 w-3.5" }: MessageStatusTicksProps) {
  if (status === "sending") {
    return <ClockIcon className={`${className} opacity-70`} />;
  }
  if (status === "error") {
    return <span className="text-[10px] leading-none text-red-300">!</span>;
  }
  if (status === "read") {
    return <DoubleTick className={className} color={READ_TICK_COLOR} />;
  }
  if (status === "delivered") {
    return <DoubleTick className={className} />;
  }
  // "sent" or unknown/undefined (e.g. a message loaded from history with no local status yet)
  return <SingleTick className={className} />;
}
