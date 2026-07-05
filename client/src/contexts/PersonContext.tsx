/**
 * PersonContext — manages the logged-in person's session.
 * A "person" is an individual (owner, co-owner, or employee) with their own login.
 * This is separate from the business account (app_users) which gates entry to the app.
 *
 * Session is stored in localStorage as "bcc_person_v1" (JSON).
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export interface PersonSession {
  id: string;
  name: string;
  email: string;
  role: "owner" | "coowner" | "employee";
  businessScope: string; // comma-separated slugs or "all"
  accountId: number;
}

interface PersonCtx {
  person: PersonSession | null;
  setPerson: (p: PersonSession | null) => void;
  isLoading: boolean;
}

const PersonContext = createContext<PersonCtx>({
  person: null,
  setPerson: () => {},
  isLoading: false,
});

const STORAGE_KEY = "bcc_person_v1";

function loadSaved(): PersonSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersonSession;
  } catch {
    return null;
  }
}

function savePerson(p: PersonSession | null) {
  try {
    if (p) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

export function PersonProvider({ children }: { children: ReactNode }) {
  const [person, setPersonState] = useState<PersonSession | null>(loadSaved);
  const [isLoading, setIsLoading] = useState(false);

  // Verify the saved session is still valid on mount
  const verifyQuery = trpc.person.get.useQuery(
    { id: person?.id ?? "" },
    {
      enabled: !!person?.id,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  useEffect(() => {
    if (!person?.id) return;
    if (verifyQuery.isLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(false);
    if (verifyQuery.data === null) {
      // Session is invalid — clear it
      setPersonState(null);
      savePerson(null);
    }
  }, [verifyQuery.data, verifyQuery.isLoading, person?.id]);

  const setPerson = (p: PersonSession | null) => {
    setPersonState(p);
    savePerson(p);
  };

  return (
    <PersonContext.Provider value={{ person, setPerson, isLoading }}>
      {children}
    </PersonContext.Provider>
  );
}

export function usePerson() {
  return useContext(PersonContext);
}
