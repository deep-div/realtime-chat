import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";
import { HeartIcon } from "../../../components/ui/HeartIcon";
import { SparkleIcon } from "../../../components/ui/SparkleIcon";

function MessageCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface p-3 shadow-lg ${className}`}>
      <div className="space-y-1.5">
        <div className="h-1.5 w-16 rounded-full bg-primary-soft" />
        <div className="h-1.5 w-20 rounded-full bg-border" />
        <div className="h-1.5 w-12 rounded-full bg-border" />
      </div>
    </div>
  );
}

export function HeroIllustration() {
  return (
    <div className="relative h-44 w-64">
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft/70 blur-xl" />

      <MessageCard className="absolute left-2 top-1 h-20 w-28 -rotate-6" />
      <MessageCard className="absolute bottom-1 right-2 h-24 w-32 rotate-6" />

      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/40">
        <ChatBubbleIcon className="h-9 w-9 text-primary-foreground" />
      </div>

      <div className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-md">
        <SparkleIcon className="h-4 w-4 text-amber-400" />
      </div>

      <div className="absolute bottom-3 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-md">
        <HeartIcon className="h-4 w-4 text-emerald-500" />
      </div>
    </div>
  );
}
