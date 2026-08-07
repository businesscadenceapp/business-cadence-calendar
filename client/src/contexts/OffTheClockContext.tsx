/**
 * OffTheClockContext — Global state for the sun/moon toggle.
 * When "Off the Clock" is active (moon mode), all hubs are dimmed
 * and business notifications are silenced.
 *
 * Persisted to localStorage so it survives page refreshes.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface OffTheClockState {
  isOffTheClock: boolean;
  toggleOffTheClock: () => void;
  setOffTheClock: (value: boolean) => void;
}

const OffTheClockContext = createContext<OffTheClockState | null>(null);

const STORAGE_KEY = "bcc_off_the_clock";

export function OffTheClockProvider({ children }: { children: ReactNode }) {
  const [isOffTheClock, setIsOffTheClock] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOffTheClock));
    } catch { /* ignore */ }
  }, [isOffTheClock]);

  const toggleOffTheClock = useCallback(() => {
    setIsOffTheClock(prev => !prev);
  }, []);

  const setOffTheClock = useCallback((value: boolean) => {
    setIsOffTheClock(value);
  }, []);

  return (
    <OffTheClockContext.Provider value={{ isOffTheClock, toggleOffTheClock, setOffTheClock }}>
      {children}
    </OffTheClockContext.Provider>
  );
}

export function useOffTheClock(): OffTheClockState {
  const ctx = useContext(OffTheClockContext);
  if (!ctx) throw new Error("useOffTheClock must be used within OffTheClockProvider");
  return ctx;
}
