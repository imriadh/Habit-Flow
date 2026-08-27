import { useState, type ReactNode } from "react";
import type { NavFn, View } from "../types";
import { useStore } from "../store";
import { Icon } from "./icons";
import { Avatar } from "./ui";
import { fmtLong, today } from "../lib/dates";

const NAV: { icon: string; label: string; view: View["name"] }[] = [
  { icon: "dashboard", label: "Dashboard", view: "dashboard" },
  { icon: "list", label: "Habits", view: "habits" },
  { icon: "calendar", label: "Calendar", view: "calendar" },
  { icon: "chart", label: "Statistics", view: "stats" },
  { icon: "spark", label: "AI Coach", view: "coach" },
];

const TITLES: Record<View["name"], string> = {
  dashboard: "Dashboard",
  habits: "Habits",
  habit: "Habit Details",
  calendar: "Calendar",
  stats: "Statistics",
  coach: "AI Coach",
  profile: "Profile",
  settings: "Settings",
};

export function Shell({
  children,
  view,
  nav,
  onAdd,
}: {
  children: ReactNode;
  view: View;
  nav: NavFn;
  onAdd: () => void;
}) {
  const { state, setSettings } = useStore();
  const [bellOpen, setBellOpen] = useState(false);
  const { profile, settings } = state;

  const reminders = state.habits.filter((h) => h.status === "active" && h.reminder);
  const dark = settings.theme === "dark";

  return (
    <div className="app">
      {/* ------------------------------ sidebar ------------------------------ */}
      <aside className="side" aria-label="Main navigation">
        <div className="side-logo">
          <span className="tile" style={{ background: "var(--leaf)", color: "#fff" }}>
            <Icon name="logo" size={22} sw={1.9} />
          </span>
          <div>
            <p className="disp heavy" style={{ fontSize: 17, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
              HabitFlow
            </p>
            <p className="txt-xs muted bold" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
              small actions
            </p>
          </div>
        </div>

        <nav className="side-nav">
          {NAV.map((n) => (
            <button
              key={n.view}
              className={`nav-item ${view.name === n.view ? "active" : ""}`}
              onClick={() => nav({ name: n.view } as View)}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="side-foot stack-s">
          <button className="btn btn-primary w-full" onClick={onAdd}>
            <Icon name="plus" size={16} sw={2.4} /> New habit
          </button>
          <div className="row-s" style={{ padding: "4px 6px" }}>
            <button
              className="nav-item"
              style={{ width: "auto", padding: "8px 10px", flex: 1 }}
              onClick={() => nav({ name: "profile" })}
            >
              <Avatar name={profile.name} size={30} />
              <span className="clip txt-s bold" style={{ color: "var(--ink2)" }}>
                {profile.name}
              </span>
            </button>
            <button
              className={`nav-item ${view.name === "settings" ? "active" : ""}`}
              style={{ width: 38, padding: 8, justifyContent: "center" }}
              onClick={() => nav({ name: "settings" })}
              aria-label="Settings"
            >
              <Icon name="gear" size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------------------- main -------------------------------- */}
      <div className="main">
        <header className="topbar">
          <div className="grow">
            <p className="topbar-title">{TITLES[view.name]}</p>
            <p className="topbar-date">{fmtLong(today())}</p>
          </div>

          <div style={{ position: "relative" }}>
            <button className="icon-btn" onClick={() => setBellOpen((o) => !o)} aria-label="Reminders" aria-expanded={bellOpen}>
              <Icon name="bell" size={18} />
            </button>
            {bellOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setBellOpen(false)} />
                <div className="reminder-pop card">
                  <p className="tag" style={{ padding: "8px 10px 4px" }}>
                    Daily reminders
                  </p>
                  {reminders.length === 0 && (
                    <p className="txt-s muted" style={{ padding: "6px 10px 10px" }}>
                      No reminders yet — add a time when creating or editing a habit.
                    </p>
                  )}
                  {reminders.map((h) => (
                    <div key={h.id} className="reminder-item">
                      <span className="tile tile-s" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}>
                        <Icon name="clock" size={15} />
                      </span>
                      <span className="grow clip txt-s bold">{h.name}</span>
                      <span className="num txt-s" style={{ color: "var(--gold-deep)" }}>
                        {h.reminder}
                      </span>
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
            title={dark ? "Light mode" : "Dark mode"}
          >
            <Icon name={dark ? "sun" : "moonStar"} size={18} />
          </button>

          <button onClick={() => nav({ name: "profile" })} aria-label="Open profile" style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
            <Avatar name={profile.name} size={36} />
          </button>
        </header>

        <main className="content">{children}</main>
      </div>

      {/* ---------------------------- mobile chrome --------------------------- */}
      <button className="fab" onClick={onAdd} aria-label="Add habit">
        <Icon name="plus" size={24} sw={2.4} />
      </button>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.slice(0, 3).map((n) => (
          <button
            key={n.view}
            className={`mnav-item ${view.name === n.view ? "active" : ""}`}
            onClick={() => nav({ name: n.view } as View)}
          >
            <Icon name={n.icon} size={20} />
            {n.label}
          </button>
        ))}
        <button className="mnav-item" onClick={onAdd} aria-label="Add habit" style={{ color: "var(--leaf-deep)" }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "var(--leaf)",
              color: "#fff",
              marginTop: -22,
              boxShadow: "0 8px 18px -8px var(--leaf)",
            }}
          >
            <Icon name="plus" size={20} sw={2.4} />
          </span>
          Add
        </button>
        {NAV.slice(3).map((n) => (
          <button
            key={n.view}
            className={`mnav-item ${view.name === n.view ? "active" : ""}`}
            onClick={() => nav({ name: n.view } as View)}
          >
            <Icon name={n.icon} size={20} />
            {n.label === "Statistics" ? "Stats" : n.label === "AI Coach" ? "Coach" : n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
