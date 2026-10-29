import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";
import { HeartIcon } from "../../../components/ui/HeartIcon";
import { SparkleIcon } from "../../../components/ui/SparkleIcon";
import { UserIcon } from "../../../components/ui/UserIcon";

function AvatarLineCard({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-xl shadow-ink/10 ring-1 ring-ink/5 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <UserIcon className="h-4 w-4 text-orange-400" />
        </div>
        <div className="h-1.5 w-28 rounded-full bg-border" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-1.5 w-32 rounded-full bg-border" />
        <div className="h-1.5 w-24 rounded-full bg-border" />
        <div className="h-1.5 w-20 rounded-full bg-border" />
      </div>
    </div>
  );
}

function LineCard({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-surface p-4 shadow-xl shadow-ink/10 ring-1 ring-ink/5 ${className}`}
    >
      <div className="space-y-2">
        <div className="h-1.5 w-24 rounded-full bg-border" />
        <div className="h-1.5 w-16 rounded-full bg-border" />
        <div className="mt-2 h-2.5 w-20 rounded-full bg-primary-soft" />
      </div>
    </div>
  );
}

export function HeroIllustration() {
  return (
    <div className="relative h-80 w-[28rem]">
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft/70 blur-2xl" />

      <AvatarLineCard className="absolute left-0 top-5 w-52 -rotate-6" />
      <LineCard className="absolute bottom-5 right-0 w-52 rotate-6" />

      <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-hover shadow-xl shadow-primary/30 ring-1 ring-white/20">
        <ChatBubbleIcon className="h-14 w-14 text-primary-foreground" />
      </div>

      <div className="absolute right-8 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-lg shadow-ink/10 ring-1 ring-ink/5">
        <SparkleIcon className="h-5 w-5 text-amber-400" />
      </div>

      <div className="absolute bottom-10 left-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-lg shadow-ink/10 ring-1 ring-ink/5">
        <HeartIcon className="h-4 w-4 text-emerald-500" />
      </div>
    </div>
  );
}
