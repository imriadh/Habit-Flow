import { useMemo, useState } from "react";
import { CATEGORIES, type CategoryId } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Avatar, ConfirmModal, Reveal, Segmented, Toggle, useToast } from "../components/ui";
import { fmtMedium, parseKey, today } from "../lib/dates";
import { currentStreak, overallLongestStreak, perfectDays, totalCompletions } from "../lib/stats";

/* --------------------------------- profile --------------------------------- */

export function Profile() {
  const { state, setProfile } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);

  const stats = useMemo(
    () => ({
      habits: state.habits.filter((h) => h.status !== "archived").length,
      completions: totalCompletions(state),
      longest: overallLongestStreak(state),
      perfect: perfectDays(state),
      bestHabitStreak: Math.max(0, ...state.habits.filter((h) => h.status === "active").map((h) => currentStreak(h, state.logs))),
      early: state.habits.filter((h) => h.reminder && h.reminder < "09:00").length,
    }),
    [state]
  );

  const catDist = useMemo(() => {
    const active = state.habits.filter((h) => h.status === "active");
    return (Object.keys(CATEGORIES) as CategoryId[]).map((c) => ({
      c,
      n: active.filter((h) => h.category === c).length,
    }));
  }, [state.habits]);
  const maxCat = Math.max(1, ...catDist.map((x) => x.n));

  const badges = [
    { icon: "spark", name: "First Spark", desc: "Log your very first check-in", earned: stats.completions >= 1 },
    { icon: "flame", name: "Seven Alive", desc: "Hold a 7-day streak on any habit", earned: stats.bestHabitStreak >= 7 },
    { icon: "check", name: "Perfect Day", desc: "Complete every scheduled check-in in a day", earned: stats.perfect >= 1 },
    { icon: "target", name: "Century Club", desc: "Reach 100 lifetime completions", earned: stats.completions >= 100 },
    { icon: "leaf", name: "Gardener", desc: "Grow 5 or more active habits", earned: stats.habits >= 5 },
    { icon: "sun", name: "Early Riser", desc: "Set 3 reminders before 9 AM", earned: stats.early >= 3 },
  ];

  const save = () => {
    if (!name.trim() || !email.trim()) {
      toast("Name and email can't be empty.", "err");
      return;
    }
    setProfile({ name: name.trim(), email: email.trim() });
    setEditing(false);
    toast("Profile updated.", "ok");
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <section className="card relative overflow-hidden p-5 sm:p-6">
          <div className="absolute -right-8 -top-8 opacity-[0.1]" style={{ color: "var(--leaf)" }}>
            <Icon name="leaf" size={180} sw={1} />
          </div>
          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar name={state.profile.name} size={84} />
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex max-w-md flex-col gap-2">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
                  <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" type="email" />
                  <div className="flex gap-2">
                    <button className="btn btn-primary !px-3.5 !py-1.5 !text-[13px]" onClick={save}>Save</button>
                    <button className="btn btn-ghost !px-3.5 !py-1.5 !text-[13px]" onClick={() => { setEditing(false); setName(state.profile.name); setEmail(state.profile.email); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">{state.profile.name}</h2>
                  <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">{state.profile.email}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface2)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink2)]">
                    <Icon name="clock" size={12} /> Tracking since {fmtMedium(parseKey(state.profile.joinedAt))}
                  </p>
                </>
              )}
            </div>
            {!editing && (
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={15} /> Edit profile
              </button>
            )}
          </div>
        </section>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active habits", value: String(stats.habits), icon: "list" },
          { label: "Lifetime check-ins", value: String(stats.completions), icon: "check" },
          { label: "Best overall streak", value: `${stats.longest}d`, icon: "flame" },
          { label: "Perfect days", value: String(stats.perfect), icon: "spark" },
        ].map((t, i) => (
          <Reveal key={t.label} delay={60 + i * 50}>
            <div className="card hrow p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">{t.label}</p>
                <Icon name={t.icon} size={16} className="text-[var(--mut)]" />
              </div>
              <p className="num mt-2 text-3xl leading-none">{t.value}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Reveal delay={120}>
          <section className="card p-5" aria-label="Badges">
            <p className="tag mb-4">Milestones</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className={`rounded-xl border p-3.5 text-center transition-all ${
                    b.earned ? "border-[var(--gold)] bg-[var(--gold-soft)]" : "border-dashed border-[var(--line2)] opacity-55"
                  }`}
                  title={b.desc}
                >
                  <span
                    className="mx-auto grid h-10 w-10 place-items-center rounded-full"
                    style={{
                      background: b.earned ? "var(--gold)" : "var(--surface2)",
                      color: b.earned ? "#fff" : "var(--mut)",
                      boxShadow: b.earned ? "0 6px 14px -6px var(--gold)" : undefined,
                    }}
                  >
                    <Icon name={b.icon} size={18} />
                  </span>
                  <p className="mt-2 text-[12px] font-bold leading-tight">{b.name}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[var(--mut)]">{b.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delay={180}>
          <section className="card p-5" aria-label="Category balance">
            <p className="tag mb-4">Category balance</p>
            <div className="space-y-3.5">
              {catDist.map(({ c, n }) => (
                <div key={c}>
                  <div className="flex items-center justify-between text-[13px] font-bold">
                    <span className="flex items-center gap-2" style={{ color: CATEGORIES[c].deep }}>
                      <Icon name={CATEGORIES[c].icon} size={14} />
                      {CATEGORIES[c].label}
                    </span>
                    <span className="num text-[var(--mut)]">{n}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(n / maxCat) * 100}%`, background: CATEGORIES[c].color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] font-medium text-[var(--mut)]">
              A balanced mix across health, learning, productivity and personal time tends to sustain best.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

/* --------------------------------- settings -------------------------------- */

export function SettingsView() {
  const { state, setSettings, exportJSON, resetAll } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const s = state.settings;

  const reminders = state.habits.filter((h) => h.status === "active" && h.reminder);

  const toggleNotifications = async (v: boolean) => {
    if (v && typeof Notification !== "undefined") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast("Browser blocked notifications — in-app reminders still work.", "warn");
        } else {
          toast("Browser notifications enabled.", "ok");
        }
      } catch {
        toast("Notifications aren't supported here.", "warn");
      }
    }
    setSettings({ notifications: v });
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div>
          <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h2>
          <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">Make HabitFlow feel like yours.</p>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Reveal delay={60}>
            <section className="card p-5" aria-label="Appearance">
              <p className="tag mb-3">Appearance</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Theme</p>
                  <p className="text-xs text-[var(--mut)]">Dark mode is easier on late-night check-ins.</p>
                </div>
                <Segmented<"light" | "dark">
                  value={s.theme}
                  onChange={(v) => setSettings({ theme: v })}
                  options={[
                    { v: "light", label: "Light" },
                    { v: "dark", label: "Dark" },
                  ]}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <div>
                  <p className="text-sm font-bold">Week starts on</p>
                  <p className="text-xs text-[var(--mut)]">Affects calendar and weekly charts.</p>
                </div>
                <Segmented<"1" | "0">
                  value={String(s.weekStart) as "1" | "0"}
                  onChange={(v) => setSettings({ weekStart: Number(v) as 0 | 1 })}
                  options={[
                    { v: "1", label: "Monday" },
                    { v: "0", label: "Sunday" },
                  ]}
                />
              </div>
            </section>
          </Reveal>

          <Reveal delay={120}>
            <section className="card p-5" aria-label="Notifications">
              <p className="tag mb-3">Reminders & coach</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Browser notifications</p>
                  <p className="text-xs text-[var(--mut)]">
                    {typeof Notification !== "undefined" && Notification.permission === "granted"
                      ? "Permission granted — you'll get a ping at reminder times."
                      : "Get a system notification when a reminder fires while HabitFlow is open."}
                  </p>
                </div>
                <Toggle checked={s.notifications} onChange={toggleNotifications} label="Browser notifications" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <div>
                  <p className="text-sm font-bold">Coach tips on dashboard</p>
                  <p className="text-xs text-[var(--mut)]">Show a daily insight card from the AI coach.</p>
                </div>
                <Toggle checked={s.coachTips} onChange={(v) => setSettings({ coachTips: v })} label="Coach tips" />
              </div>
            </section>
          </Reveal>

          <Reveal delay={180}>
            <section className="card p-5" aria-label="Data">
              <p className="tag mb-3">Your data</p>
              <p className="text-[13px] font-medium text-[var(--ink2)]">
                Everything lives in this browser's local storage — private by default. Export a JSON backup any time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-ghost !text-[13px]" onClick={() => { exportJSON(); toast("Backup downloaded.", "ok"); }}>
                  <Icon name="download" size={15} /> Export data
                </button>
                <button className="btn btn-danger !text-[13px]" onClick={() => setConfirmReset(true)}>
                  <Icon name="refresh" size={15} /> Reset to demo data
                </button>
              </div>
            </section>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <section className="card p-5" aria-label="Reminder schedule">
            <p className="tag mb-1">Reminder schedule</p>
            <p className="mb-4 text-xs text-[var(--mut)]">In-app reminders fire at these times while HabitFlow is open.</p>
            {reminders.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--line2)] px-4 py-6 text-center text-[13px] font-medium text-[var(--mut)]">
                No reminders set. Add times when editing a habit.
              </p>
            )}
            <ul className="space-y-2">
              {[...reminders]
                .sort((a, b) => (a.reminder! < b.reminder! ? -1 : 1))
                .map((h) => (
                  <li key={h.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5">
                    <span className="num w-16 flex-none text-sm text-[var(--gold-deep)]">{h.reminder}</span>
                    <Icon name={h.icon} size={16} className="text-[var(--mut)]" />
                    <span className="truncate text-[13px] font-bold">{h.name}</span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[var(--mut)]">
                      <Icon name="bell" size={12} /> daily
                    </span>
                  </li>
                ))}
            </ul>
            <div className="mt-5 rounded-xl bg-[var(--surface2)] p-4">
              <p className="flex items-center gap-2 text-[12px] font-bold text-[var(--ink2)]">
                <Icon name="logo" size={15} className="text-[var(--leaf)]" /> About HabitFlow
              </p>
              <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-[var(--mut)]">
                A calm, data-driven habit tracker built as a complete student project: tracking, streaks, history,
                statistics and an on-device coach. Small actions. Consistent progress. Better habits.
              </p>
            </div>
          </section>
        </Reveal>
      </div>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
        body="Your current habits, history and settings will be replaced with the original demo data. Export a backup first if you want to keep anything."
        confirmLabel="Reset everything"
        onConfirm={() => {
          resetAll();
          toast("Demo data restored.", "info");
        }}
      />
    </div>
  );
}
