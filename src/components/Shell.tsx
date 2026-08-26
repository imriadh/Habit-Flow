import { useMemo, useState, type ReactNode } from "react";
import type { NavFn, View } from "../types";
import { useStore } from "../store";
import { Icon } from "./icons";
import { Avatar } from "./ui";
import { fmtLong, today } from "../lib/dates";
import { dayState, habitLog, overallCurrentStreak } from "../lib/stats";
import { dkey } from "../lib/dates";

const NAV: { v: View["name"]; label: string; icon: string }[] = [
  { v: "dashboard", label: "Dashboard", icon: "dashboard" },
  { v: "habits", label: "Habits", icon: "list" },
  { v: "calendar", label: "Calendar", icon: "calendar" },
  { v: "stats", label: "Statistics", icon: "chart" },
  { v: "coach", label: "AI Coach", icon: "spark" },
];

const TITLES: Record<View["name"], string> = {
  dashboard: "Dashboard",
  habits: "Habits",
  habit: "Habit details",
  calendar: "Calendar",
  stats: "Statistics",
  coach: "AI Coach",
  profile: "Profile",
  settings: "Settings",
};

export function Shell({
  view,
  nav,
  onAdd,
  children,
}: {
  view: View;
  nav: NavFn;
  onAdd: () => void;
  children: ReactNode;
}) {
  const { state, setSettings } = useStore();
  const [bellOpen, setBellOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const streak = useMemo(() => overallCurrentStreak(state), [state]);
  const dark = state.settings.theme === "dark";

  const reminders = useMemo(() => {
    const tk = dkey(today());
    return state.habits
      .filter((h) => h.status === "active" && h.reminder)
      .sort((a, b) => (a.reminder! < b.reminder! ? -1 : 1))
      .map((h) => ({
        h,
        done: dayState(h, today(), habitLog(state.logs, h.id, tk)) === "done",
      }));
  }, [state]);

  return (
    <div className="min-h-screen">
      {/* ------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-sm lg:flex">
        <button
          className="flex items-center gap-2.5 px-5 pb-5 pt-6 text-left"
          onClick={() => nav({ name: "dashboard" })}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--leaf)] text-white">
            <Icon name="logo" size={21} sw={1.9} />
          </span>
          <span>
            <span className="disp block text-[17px] font-extrabold leading-none tracking-tight">HabitFlow</span>
            <span className="block text-[11px] font-semibold text-[var(--mut)]">small actions, daily</span>
          </span>
        </button>

        <nav className="flex flex-col gap-1 px-3.5" aria-label="Main">
          {NAV.map((n) => (
            <button
              key={n.v}
              className={`nav-item ${view.name === n.v ? "active" : ""}`}
              onClick={() => nav({ name: n.v } as View)}
            >
              <Icon name={n.icon} size={19} />
              {n.label}
              {n.v === "coach" && (
                <span className="ml-auto rounded-full bg-[var(--gold-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--gold-deep)]">
                  AI
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-1 px-3.5">
          <p className="tag px-3 pb-1">You</p>
          <button
            className={`nav-item ${view.name === "profile" ? "active" : ""}`}
            onClick={() => nav({ name: "profile" })}
          >
            <Icon name="user" size={19} />
            Profile
          </button>
          <button
            className={`nav-item ${view.name === "settings" ? "active" : ""}`}
            onClick={() => nav({ name: "settings" })}
          >
            <Icon name="gear" size={19} />
            Settings
          </button>
        </div>

        <div className="mt-auto space-y-3 px-3.5 pb-5">
          <button
            className="card group w-full cursor-pointer p-3.5 text-left transition-transform hover:-translate-y-0.5"
            onClick={() => nav({ name: "stats" })}
            title="Open statistics"
          >
            <div className="flex items-center gap-2.5">
              <span className="flame-live" style={{ color: streak > 0 ? "var(--gold)" : "var(--mut)" }}>
                <Icon name="flame" size={26} sw={1.9} />
              </span>
              <div>
                <p className="num text-xl leading-none text-[var(--ink)]">{streak}</p>
                <p className="text-[11px] font-semibold text-[var(--mut)]">
                  day streak {streak > 0 ? "· keep it alive" : "· start today"}
                </p>
              </div>
            </div>
          </button>
          <button
            className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] p-2.5 text-left transition-colors hover:border-[var(--line2)]"
            onClick={() => nav({ name: "profile" })}
          >
            <Avatar name={state.profile.name} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold leading-tight">{state.profile.name}</span>
              <span className="block truncate text-[11px] text-[var(--mut)]">{state.profile.email}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* -------------------------------- content ------------------------------ */}
      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--leaf)] text-white lg:hidden">
              <Icon name="logo" size={20} sw={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="disp truncate text-[17px] font-extrabold leading-tight tracking-tight sm:text-lg">
                {TITLES[view.name]}
              </h1>
              <p className="hidden text-xs font-medium text-[var(--mut)] sm:block">{fmtLong(today())}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* reminders bell */}
              <div className="relative">
                <button
                  className={`icon-btn relative ${bellOpen ? "!border-[var(--leaf)] !text-[var(--leaf-deep)]" : ""}`}
                  onClick={() => setBellOpen((o) => !o)}
                  aria-label="Today's reminders"
                  aria-expanded={bellOpen}
                >
                  <Icon name="bell" size={18} />
                  {reminders.some((r) => !r.done) && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--coral)]" />
                  )}
                </button>
                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
                    <div className="menu-pop card absolute right-0 top-12 z-20 w-72 p-2">
                      <p className="tag px-3 pb-2 pt-1.5">Today's reminders</p>
                      {reminders.length === 0 && (
                        <p className="px-3 pb-3 text-sm text-[var(--mut)]">No reminders set yet.</p>
                      )}
                      {reminders.map(({ h, done }) => (
                        <div key={h.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[var(--surface2)]">
                          <span className="tile !h-8 !w-8 !rounded-lg" style={{ background: "var(--surface2)", color: "var(--ink2)" }}>
                            <Icon name={h.icon} size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold leading-tight">{h.name}</p>
                            <p className="text-[11px] text-[var(--mut)]">{h.reminder}</p>
                          </div>
                          {done ? (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--leaf)] text-white">
                              <Icon name="check" size={11} sw={2.6} />
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-[var(--gold)] pulse-soft" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                className="icon-btn"
                onClick={() => setSettings({ theme: dark ? "light" : "dark" })}
                aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
                title={dark ? "Light theme" : "Dark theme"}
              >
                <Icon name={dark ? "sun" : "moonStar"} size={18} />
              </button>

              <button className="btn btn-primary !py-2" onClick={onAdd}>
                <Icon name="plus" size={16} sw={2.4} />
                <span className="hidden sm:inline">New habit</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* ----------------------------- mobile bottom nav ------------------------ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {NAV.filter((n) => ["dashboard", "habits"].includes(n.v)).map((n) => (
            <MobileTab key={n.v} n={n} view={view} nav={nav} />
          ))}
          <button
            className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--leaf)] text-white shadow-lg transition-transform active:scale-95"
            onClick={onAdd}
            aria-label="Add habit"
          >
            <Icon name="plus" size={24} sw={2.4} />
          </button>
          <MobileTab n={NAV[4]} view={view} nav={nav} />
          <button
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-bold ${sheetOpen ? "text-[var(--leaf-deep)]" : "text-[var(--mut)]"}`}
            onClick={() => setSheetOpen(true)}
            aria-label="More options"
          >
            <Icon name="dots" size={20} />
            More
          </button>
        </div>
      </nav>

      {/* mobile sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[rgba(10,16,11,0.5)]" onClick={() => setSheetOpen(false)} />
          <div className="sheet-in absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--line)] bg-[var(--surface)] p-4 pb-8">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--line2)]" />
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { v: "calendar", label: "Calendar", icon: "calendar" },
                  { v: "stats", label: "Stats", icon: "chart" },
                  { v: "profile", label: "Profile", icon: "user" },
                  { v: "settings", label: "Settings", icon: "gear" },
                ] as { v: View["name"]; label: string; icon: string }[]
              ).map((n) => (
                <button
                  key={n.v}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface2)] py-3.5 text-[11px] font-bold text-[var(--ink2)] transition-transform active:scale-95"
                  onClick={() => {
                    setSheetOpen(false);
                    nav({ name: n.v } as View);
                  }}
                >
                  <Icon name={n.icon} size={20} />
                  {n.label}
                </button>
              ))}
            </div>
            <button
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3"
              onClick={() => setSettings({ theme: dark ? "light" : "dark" })}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink2)]">
                <Icon name={dark ? "sun" : "moonStar"} size={17} />
                {dark ? "Light theme" : "Dark theme"}
              </span>
              <Icon name="chevR" size={16} className="text-[var(--mut)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTab({ n, view, nav }: { n: (typeof NAV)[number]; view: View; nav: NavFn }) {
  const active = view.name === n.v;
  return (
    <button
      className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${
        active ? "text-[var(--leaf-deep)]" : "text-[var(--mut)]"
      }`}
      onClick={() => nav({ name: n.v } as View)}
      aria-current={active ? "page" : undefined}
    >
      <Icon name={n.icon} size={20} sw={active ? 2.1 : 1.7} />
      {n.label}
    </button>
  );
}
