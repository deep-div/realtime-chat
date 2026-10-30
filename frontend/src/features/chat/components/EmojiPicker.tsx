import { useEffect, useRef } from "react";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤔", "😎", "🥳", "😢", "😭", "😡", "😴", "🤗"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🙏", "👋", "💪", "🤝", "✌️", "🤞"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💕", "💔", "😻"],
  },
  {
    label: "Misc",
    emojis: ["🔥", "✨", "🎉", "🎂", "⭐", "💯", "✅", "❌", "☕", "🍕"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl border border-border bg-surface p-3 shadow-lg"
    >
      <div className="max-h-64 space-y-3 overflow-y-auto scrollbar-hide">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-muted"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
