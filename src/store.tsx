import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Habit, LogEntry, Profile, Settings } from "./types";
import { dkey, logKey, today, uid } from "./lib/dates";
import { buildSeed } from "./lib/seed";

const KEY = "habitflow:v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && Array.isArray(s.habits) && s.logs && s.profile && s.settings) return s;
    }
  } catch {
    /* corrupted → reseed */
  }
  return buildSeed();
}

export interface StoreApi {
  state: AppState;
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "status">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  setLog: (habitId: string, dateKey: string, patch: Partial<LogEntry> | null) => void;
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
  resetAll: () => void;
  exportJSON: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full — ignore */
    }
  }, [state]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      addHabit: (h) =>
        setState((s) => ({
          ...s,
          habits: [
            ...s.habits,
            { ...h, id: uid(), status: "active" as const, createdAt: dkey(today()) },
          ],
        })),
      updateHabit: (id, patch) =>
        setState((s) => ({
          ...s,
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),
      removeHabit: (id) =>
        setState((s) => {
          const logs: AppState["logs"] = {};
          for (const k in s.logs) if (!k.startsWith(id + "|")) logs[k] = s.logs[k];
          return { ...s, logs, habits: s.habits.filter((h) => h.id !== id) };
        }),
      setLog: (habitId, dateKey, patch) =>
        setState((s) => {
          const k = logKey(habitId, dateKey);
          if (patch === null) {
            const logs = { ...s.logs };
            delete logs[k];
            return { ...s, logs };
          }
          const h = s.habits.find((x) => x.id === habitId);
          const prev = s.logs[k] ?? { done: false };
          const next: LogEntry = { ...prev, ...patch, at: Date.now() };
          if (h?.goal && next.value !== undefined && !next.skipped)
            next.done = next.value >= h.goal.value;
          return { ...s, logs: { ...s.logs, [k]: next } };
        }),
      setProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      setSettings: (st) => setState((s) => ({ ...s, settings: { ...s.settings, ...st } })),
      resetAll: () => setState(buildSeed()),
      exportJSON: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "habitflow-data.json";
        a.click();
        URL.revokeObjectURL(url);
      },
    }),
    [state]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
