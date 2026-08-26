import { useEffect, useRef, useState } from "react";
import type { Habit, View } from "./types";
import { StoreProvider, useStore } from "./store";
import { ToastProvider, useToast } from "./components/ui";
import { Shell } from "./components/Shell";
import { HabitModal } from "./components/HabitModal";
import { Dashboard } from "./views/Dashboard";
import { Habits } from "./views/Habits";
import { HabitDetail } from "./views/HabitDetail";
import { CalendarView } from "./views/Calendar";
import { Statistics } from "./views/Statistics";
import { Coach } from "./views/Coach";
import { Profile, SettingsView } from "./views/ProfileSettings";
import { dkey, nowHM, today } from "./lib/dates";
import { dayState, habitLog } from "./lib/stats";

function AppInner() {
  const { state } = useStore();
  const toast = useToast();
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [modal, setModal] = useState<{ open: boolean; initial: Habit | null }>({ open: false, initial: null });
  const firedRef = useRef<Set<string>>(new Set());
  const dayRef = useRef(dkey(today()));

  /* theme */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  /* scroll to top on navigation */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  /* in-app reminders */
  useEffect(() => {
    const check = () => {
      const tk = dkey(today());
      if (dayRef.current !== tk) {
        dayRef.current = tk;
        firedRef.current.clear();
      }
      const hm = nowHM();
      for (const h of state.habits) {
        if (h.status !== "active" || !h.reminder || h.reminder !== hm) continue;
        const st = dayState(h, today(), habitLog(state.logs, h.id, tk));
        if (st === "done" || st === "skipped") continue;
        const key = `${h.id}|${tk}|${hm}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        toast(`Reminder · ${h.name} — ${h.goal ? `${h.goal.value} ${h.goal.unit} waiting` : "time to check in"}`, "warn");
        if (state.settings.notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("HabitFlow", { body: `${h.name} — time to check in.` });
          } catch {
            /* ignore */
          }
        }
      }
    };
    check();
    const id = window.setInterval(check, 20000);
    return () => window.clearInterval(id);
  }, [state, toast]);

  const openAdd = () => setModal({ open: true, initial: null });
  const openEdit = (id: string) => {
    const h = state.habits.find((x) => x.id === id) ?? null;
    setModal({ open: true, initial: h });
  };

  return (
    <Shell view={view} nav={setView} onAdd={openAdd}>
      {view.name === "dashboard" && <Dashboard nav={setView} onAdd={openAdd} />}
      {view.name === "habits" && <Habits nav={setView} onAdd={openAdd} onEdit={openEdit} />}
      {view.name === "habit" && <HabitDetail id={view.id} nav={setView} onEdit={openEdit} />}
      {view.name === "calendar" && <CalendarView />}
      {view.name === "stats" && <Statistics />}
      {view.name === "coach" && <Coach />}
      {view.name === "profile" && <Profile />}
      {view.name === "settings" && <SettingsView />}

      <HabitModal open={modal.open} initial={modal.initial} onClose={() => setModal({ open: false, initial: null })} />
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </StoreProvider>
  );
}
