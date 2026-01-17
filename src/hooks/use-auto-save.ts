import { useEffect, useRef, useState, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  saveNow: () => Promise<void>;
}

/**
 * Auto-save hook with debounce and save status indicator
 *
 * @param value - The value to auto-save
 * @param onSave - Async function to persist the value
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 * @param enabled - Whether auto-save is enabled (default: true)
 * @returns saveStatus and saveNow function for immediate save
 */
export function useAutoSave<T>({
  value,
  onSave,
  delay = 500,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef<T>(value);
  const isSavingRef = useRef(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(
    async (valueToSave: T) => {
      if (isSavingRef.current) return;

      try {
        isSavingRef.current = true;
        setSaveStatus("saving");
        await onSave(valueToSave);
        lastSavedValueRef.current = valueToSave;
        setSaveStatus("saved");

        // Reset to idle after 2 seconds
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("error");

        // Reset to idle after 3 seconds on error
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } finally {
        isSavingRef.current = false;
      }
    },
    [onSave],
  );

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave(value);
  }, [value, performSave]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return;

    // Check if value has changed
    const hasChanged = value !== lastSavedValueRef.current;
    if (!hasChanged) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced save
    debounceTimerRef.current = setTimeout(() => {
      performSave(value);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, delay, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    saveNow,
  };
}
