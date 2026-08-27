import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Habit, LogEntry, Profile, Settings } from "./types";
import { dkey, logKey, today, uid } from "./lib/dates";
import { buildSeed } from "./lib/seed";
import {
  clearCloud,
  cloudEnabled,
  pullCloud,
  pushAll,
  pushHabit,
  pushHabitDelete,
  pushLog,
  pushProfile,
  pushSettings,
} from "./lib/supabase";

const KEY = "habitflow:v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && Array.isArray(s.habits) && s.logs && s.profile && s.settings)
        return { ...s, guest: !!s.guest };
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
  enterDemo: () => void;
  exitDemo: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [state, setState] = useState<AppState>(load);
  const stateRef = useRef(state);
  stateRef.current = state;

  const sync = cloudEnabled && !!userId;

  /* persist locally */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full — ignore */
    }
  }, [state]);

  /* hydrate from Supabase once per signed-in user */
  const pulledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !cloudEnabled || pulledFor.current === userId) return;
    pulledFor.current = userId;
    let live = true;
    pullCloud(userId).then((remote) => {
      if (!live) return;
      if (remote && remote.habits.length > 0) {
        setState((s) => ({
          ...s,
          habits: remote.habits,
          logs: remote.logs,
          profile: remote.profile ?? s.profile,
          settings: { ...s.settings, ...(remote.settings ?? {}) },
          guest: false,
        }));
      } else {
        // empty account → seed the cloud with what's on this device
        pushAll(userId, stateRef.current);
      }
    });
    return () => {
      live = false;
      pulledFor.current = null; // allow re-hydration on next mount (React StrictMode safe)
    };
  }, [userId]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      addHabit: (h) => {
        const full: Habit = { ...h, id: uid(), status: "active", createdAt: dkey(today()) };
        setState((s) => ({ ...s, habits: [...s.habits, full] }));
        if (sync && userId) pushHabit(userId, full);
      },
      updateHabit: (id, patch) => {
        const merged = stateRef.current.habits.map((h) => (h.id === id ? { ...h, ...patch } : h));
        setState((s) => ({ ...s, habits: merged }));
        if (sync && userId) {
          const h = merged.find((x) => x.id === id);
          if (h) pushHabit(userId, h);
        }
      },
      removeHabit: (id) => {
        setState((s) => {
          const logs: AppState["logs"] = {};
          for (const k in s.logs) if (!k.startsWith(id + "|")) logs[k] = s.logs[k];
          return { ...s, logs, habits: s.habits.filter((h) => h.id !== id) };
        });
        if (sync && userId) pushHabitDelete(userId, id);
      },
      setLog: (habitId, dateKey, patch) => {
        const h = stateRef.current.habits.find((x) => x.id === habitId);
        const k = logKey(habitId, dateKey);
        const prev = stateRef.current.logs[k] ?? { done: false };
        let next: LogEntry | null = null;
        if (patch !== null) {
          next = { ...prev, ...patch, at: Date.now() };
          if (h?.goal && next.value !== undefined && !next.skipped)
            next.done = next.value >= h.goal.value;
        }
        setState((s) => {
          if (next === null) {
            const logs = { ...s.logs };
            delete logs[k];
            return { ...s, logs };
          }
          return { ...s, logs: { ...s.logs, [k]: next! } };
        });
        if (sync && userId) pushLog(userId, habitId, dateKey, next);
      },
      setProfile: (p) => {
        const merged = { ...stateRef.current.profile, ...p };
        setState((s) => ({ ...s, profile: merged }));
        if (sync && userId) pushProfile(userId, merged);
      },
      setSettings: (st) => {
        const merged = { ...stateRef.current.settings, ...st };
        setState((s) => ({ ...s, settings: merged }));
        if (sync && userId) pushSettings(userId, merged);
      },
      resetAll: () => {
        const fresh = buildSeed();
        setState((s) => ({ ...fresh, guest: s.guest }));
        if (sync && userId) {
          clearCloud(userId);
          pushAll(userId, fresh);
        }
      },
      exportJSON: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "habitflow-data.json";
        a.click();
        URL.revokeObjectURL(url);
      },
      enterDemo: () => setState((s) => ({ ...s, guest: true })),
      exitDemo: () => setState((s) => ({ ...s, guest: false })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, sync, userId]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
