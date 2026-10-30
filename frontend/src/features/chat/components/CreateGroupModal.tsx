import { useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { SearchIcon } from "../../../components/ui/SearchIcon";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Placeholder contact list - no backend wiring yet, just UI for picking group members. */
const DUMMY_CONTACTS = [
  "Ananya Sharma",
  "Liam Carter",
  "Priya Verma",
  "Noah Williams",
  "Sophia Kapoor",
  "Arjun Mehta",
  "Olivia Bennett",
];

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const contacts = DUMMY_CONTACTS.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggleContact(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  function handleClose() {
    setGroupName("");
    setQuery("");
    setSelected([]);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h2 className="text-lg font-semibold text-ink">New group</h2>
      <p className="mt-0.5 text-xs text-ink-muted">UI preview only - not wired up yet.</p>

      <input
        type="text"
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        placeholder="Group name"
        className="mt-4 w-full rounded-xl bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-2.5 rounded-full bg-surface-muted px-4 py-2.5">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">{selected.length} selected</p>
      )}

      <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto scrollbar-hide">
        {contacts.map((name) => {
          const isSelected = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleContact(name)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <Avatar label={name} className="h-9 w-9 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-primary bg-primary" : "border-border"
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-primary-foreground">
                    <path
                      d="M5 12l5 5L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        disabled={!groupName.trim() || selected.length === 0}
        onClick={handleClose}
        className="mt-4 w-full"
      >
        Create group
      </Button>
    </Modal>
  );
}
