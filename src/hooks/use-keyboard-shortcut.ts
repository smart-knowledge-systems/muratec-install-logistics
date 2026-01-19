"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  key: string;
  onTrigger: () => void;
  enabled?: boolean;
}

/**
 * Hook to register a keyboard shortcut listener
 * Only active when enabled (defaults to true)
 */
export function useKeyboardShortcut({
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  metaKey = false,
  key,
  onTrigger,
  enabled = true,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check all modifier keys match
      if (
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey &&
        event.metaKey === metaKey &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        event.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [ctrlKey, shiftKey, altKey, metaKey, key, onTrigger, enabled]);
}
