import { useEffect, useRef, useState } from "react";
import type { Habit, View } from "./types";
import { StoreProvider, useStore } from "./store";
import { ToastProvider, useToast } from "./components/ui";
import { Icon } from "./components/icons";
import { Shell } from "./components/Shell";
import { HabitModal } from "./components/HabitModal";
import { Auth } from "./views/Auth";
import { Dashboard } from "./views/Dashboard";
import { Habits } from "./views/Habits";
import { HabitDetail } from "./views/HabitDetail";
import { CalendarView } from "./views/Calendar";
import { Statistics } from "./views/Statistics";
import { Coach } from "./views/Coach";
import { Profile, SettingsView } from "./views/ProfileSettings";
import { dkey, nowHM, today } from "./lib/dates";
import { dayState, habitLog } from "./lib/stats";
import { cloudEnabled, onAuthChange, signOutUser } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";

function Inner({ user, ready }: { user: User | null; ready: boolean }) {
  const { state, enterDemo, exitDemo, resetAll } = useStore();
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

  /* reminders (in-app toasts + optional browser notifications) */
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

  if (!ready) {
    return (
      <div className="splash">
        <div className="splash-box pulse-soft">
          <span className="tile tile-l" style={{ background: "var(--leaf)", color: "#fff" }}>
            <Icon name="logo" size={28} sw={1.9} />
          </span>
          <p className="disp heavy">HabitFlow</p>
        </div>
      </div>
    );
  }

  const authed = !!user || state.guest;
  if (!authed) return <Auth onDemo={enterDemo} />;

  const handleSignOut = async () => {
    if (user && cloudEnabled) await signOutUser();
    exitDemo();
    setView({ name: "dashboard" });
  };

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
      {view.name === "profile" && <Profile onSignOut={handleSignOut} />}
      {view.name === "settings" && <SettingsView onReset={resetAll} />}

      <HabitModal open={modal.open} initial={modal.initial} onClose={() => setModal({ open: false, initial: null })} />
    </Shell>
  );
}

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!cloudEnabled);

  useEffect(() => {
    if (!cloudEnabled) return;
    const sub = onAuthChange((u) => {
      setUser(u);
      setReady(true);
    });
    return () => sub.unsubscribe();
  }, []);

  return (
    <StoreProvider userId={user?.id ?? null}>
      <ToastProvider>
        <Inner user={user} ready={ready} />
      </ToastProvider>
    </StoreProvider>
  );
}

export default function App() {
  return <Root />;
}
