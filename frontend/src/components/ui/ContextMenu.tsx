import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ContextMenuPosition } from "./useContextMenu";

const MENU_WIDTH_PX = 180;
const EDGE_MARGIN_PX = 8;

interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** A small right-click/long-press menu, portaled to <body> so it never gets clipped by a
 * scrollable ancestor (the chat list, the message thread). */
export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    top: position.y,
    left: position.x,
    visibility: "hidden",
  });

  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const { offsetWidth, offsetHeight } = node;
    setStyle({
      top: Math.min(position.y, window.innerHeight - offsetHeight - EDGE_MARGIN_PX),
      left: Math.min(position.x, window.innerWidth - offsetWidth - EDGE_MARGIN_PX),
      visibility: "visible",
    });
  }, [position]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", width: MENU_WIDTH_PX, ...style }}
      className="z-50 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={`block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-surface-muted ${
            item.destructive ? "text-red-500" : "text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
