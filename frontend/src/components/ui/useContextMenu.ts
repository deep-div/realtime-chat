import { useRef, useState } from "react";

const LONG_PRESS_MS = 450;
const TOUCH_MOVE_CANCEL_PX = 10;

export interface ContextMenuPosition {
  x: number;
  y: number;
}

/** Opens a context menu on right-click (desktop) or long-press (touch), at the pointer's
 * position. Suppresses the tap-to-click that would otherwise fire right after a long press. */
export function useContextMenu() {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<ContextMenuPosition | null>(null);
  const suppressClickRef = useRef(false);

  function open(x: number, y: number) {
    setPosition({ x, y });
  }

  function close() {
    setPosition(null);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  /** Call from a row's onClick before acting on it - returns true (and resets) if the
   * click was really the tap-release from a long press that already opened the menu. */
  function consumeSuppressedClick(): boolean {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  const triggerProps = {
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      open(event.clientX, event.clientY);
    },
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      cancelLongPress();
      longPressTimerRef.current = setTimeout(() => {
        suppressClickRef.current = true;
        open(touch.clientX, touch.clientY);
      }, LONG_PRESS_MS);
    },
    onTouchMove: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      const start = touchStartRef.current;
      if (!touch || !start) return;
      if (Math.abs(touch.clientX - start.x) > TOUCH_MOVE_CANCEL_PX ||
        Math.abs(touch.clientY - start.y) > TOUCH_MOVE_CANCEL_PX) {
        cancelLongPress();
      }
    },
    onTouchEnd: cancelLongPress,
    onTouchCancel: cancelLongPress,
  };

  return { position, close, consumeSuppressedClick, triggerProps };
}
