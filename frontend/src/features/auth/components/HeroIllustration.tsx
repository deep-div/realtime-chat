import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";
import { HeartIcon } from "../../../components/ui/HeartIcon";
import { SparkleIcon } from "../../../components/ui/SparkleIcon";

function MessageCard({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-surface p-3 shadow-xl shadow-ink/5 ring-1 ring-ink/5 ${className}`}
    >
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
    <div className="relative h-52 w-72">
      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft/80 blur-2xl" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-[60%] -translate-y-[55%] rounded-full bg-amber-200/30 blur-2xl" />

      <MessageCard className="absolute left-3 top-2 h-20 w-28 -rotate-6" />
      <MessageCard className="absolute bottom-2 right-3 h-24 w-32 rotate-6" />

      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-[float_4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-xl shadow-primary/40 ring-1 ring-white/20">
        <ChatBubbleIcon className="h-9 w-9 text-primary-foreground" />
      </div>

      <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-lg shadow-ink/10 ring-1 ring-ink/5">
        <SparkleIcon className="h-4 w-4 text-amber-400" />
      </div>

      <div className="absolute bottom-5 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-lg shadow-ink/10 ring-1 ring-ink/5">
        <HeartIcon className="h-4 w-4 text-emerald-500" />
      </div>
    </div>
  );
}
