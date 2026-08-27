import { useMemo, useState } from "react";
import { CATEGORIES } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Avatar, ConfirmModal, Reveal, Toggle, useToast } from "../components/ui";
import { fmtMedium, parseKey } from "../lib/dates";
import { overallLongestStreak, perfectDays, totalCompletions } from "../lib/stats";
import { cloudEnabled } from "../lib/supabase";

/* --------------------------------- profile --------------------------------- */

export function Profile({ onSignOut }: { onSignOut: () => void }) {
  const { state, setProfile } = useStore();
  const toast = useToast();
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);

  const totals = useMemo(
    () => ({
      habits: state.habits.filter((h) => h.status !== "archived").length,
      completions: totalCompletions(state),
      longest: overallLongestStreak(state),
      perfect30: perfectDays(state, 30),
    }),
    [state]
  );

  const catMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of state.habits.filter((x) => x.status !== "archived"))
      counts.set(h.category, (counts.get(h.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.habits]);

  const badges = [
    { icon: "flame", label: "On Fire", desc: "Longest streak 7+ days", earned: totals.longest >= 7, soft: "var(--gold-soft)", deep: "var(--gold-deep)" },
    { icon: "book", label: "Collector", desc: "100+ lifetime check-ins", earned: totals.completions >= 100, soft: "var(--teal-soft)", deep: "var(--teal-deep)" },
    { icon: "check", label: "Perfect Week", desc: "7 perfect days in 30", earned: totals.perfect30 >= 7, soft: "var(--leaf-soft)", deep: "var(--leaf-deep)" },
    { icon: "moonStar", label: "Night Owl", desc: "A habit scheduled after 21:00", earned: state.habits.some((h) => h.reminder && h.reminder >= "21:00"), soft: "var(--plum-soft)", deep: "var(--plum-deep)" },
  ];

  const save = () => {
    if (!name.trim()) return toast("Name can't be empty.", "err");
    setProfile({ name: name.trim(), email: email.trim() });
    toast("Profile saved.", "ok");
  };

  return (
    <div className="stack-l">
      <Reveal>
        <div className="split">
          <section className="card pad-xl">
            <div className="row-l top">
              <Avatar name={name || state.profile.name} size={72} />
              <div className="grow stack-s">
                <div>
                  <h2 className="h1">{name || "—"}</h2>
                  <p className="txt-s muted mt-s">
                    Member since {fmtMedium(parseKey(state.profile.joinedAt || state.habits[0]?.createdAt || "2025-01-01"))}
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="pf-name">Display name</label>
                  <input id="pf-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="pf-email">Email</label>
                  <input id="pf-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!state.guest && cloudEnabled} />
                  {!state.guest && cloudEnabled && (
                    <p className="txt-xs muted mt-s">Email comes from your Supabase account and can't be edited here.</p>
                  )}
                </div>
                <div>
                  <button className="btn btn-primary" onClick={save}>
                    <Icon name="check" size={15} sw={2.4} /> Save profile
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="stack">
            <section className="card pad-l">
              <p className="tag mb-s">Lifetime</p>
              <div className="grid-2">
                {[
                  { label: "Habits", value: totals.habits },
                  { label: "Check-ins", value: totals.completions },
                  { label: "Best streak", value: `${totals.longest}d` },
                  { label: "Perfect days", value: totals.perfect30 },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "10px 0" }}>
                    <p className="num" style={{ fontSize: 26, lineHeight: 1 }}>{s.value}</p>
                    <p className="txt-xs bold muted mt-s">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card pad-l">
              <p className="tag mb-s">Category balance</p>
              {catMix.length === 0 && <p className="txt-s muted">No active habits yet.</p>}
              <div className="stack-s">
                {catMix.map(([catId, n]) => {
                  const c = CATEGORIES[catId as keyof typeof CATEGORIES];
                  return (
                    <div key={catId} className="row-s">
                      <span className="tile tile-s" style={{ background: c.soft, color: c.deep }}>
                        <Icon name={c.icon} size={14} />
                      </span>
                      <span className="bold txt-s grow">{c.label}</span>
                      <span className="num txt-s">{n}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <section className="card pad-l">
          <p className="tag mb-m">Badges</p>
          <div className="grid-4">
            {badges.map((b) => (
              <div
                key={b.label}
                className="row-s card pad"
                style={{ opacity: b.earned ? 1 : 0.45, filter: b.earned ? "none" : "grayscale(0.6)", boxShadow: "none" }}
              >
                <span className="tile" style={{ background: b.soft, color: b.deep }}>
                  <Icon name={b.icon} size={19} />
                </span>
                <div>
                  <p className="bold txt-s">{b.label}</p>
                  <p className="txt-xs muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="card pad-l">
          <div className="row spread wrap">
            <div className="row-s">
              <span className="tile tile-s" style={{ background: cloudEnabled && !state.guest ? "var(--leaf-soft)" : "var(--gold-soft)", color: cloudEnabled && !state.guest ? "var(--leaf-deep)" : "var(--gold-deep)" }}>
                <Icon name={cloudEnabled && !state.guest ? "cloud" : "spark"} size={15} />
              </span>
              <div>
                <p className="bold txt-s">{cloudEnabled && !state.guest ? `Signed in · ${state.profile.email || "Supabase account"}` : "Demo mode — data lives on this device"}</p>
                <p className="txt-xs muted">
                  {cloudEnabled && !state.guest
                    ? "Habits and logs sync to your Supabase database."
                    : "Sign in (or create an account) to sync your habits across devices."}
                </p>
              </div>
            </div>
            <button className="btn btn-danger btn-s" onClick={onSignOut}>
              <Icon name="arrowL" size={14} /> Sign out
            </button>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

/* --------------------------------- settings -------------------------------- */

export function SettingsView({ onReset }: { onReset: () => void }) {
  const { state, setSettings, exportJSON } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const s = state.settings;

  const askNotification = async (v: boolean) => {
    if (!v) {
      setSettings({ notifications: false });
      return;
    }
    if (typeof Notification === "undefined") {
      toast("This browser doesn't support notifications.", "err");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setSettings({ notifications: true });
      toast("Browser notifications enabled.", "ok");
    } else {
      toast("Permission blocked — in-app reminders still work.", "warn");
    }
  };

  const Row = ({
    icon,
    title,
    sub,
    children,
  }: {
    icon: string;
    title: string;
    sub: string;
    children: React.ReactNode;
  }) => (
    <div className="row spread" style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="row-s top">
        <span className="tile tile-s" style={{ background: "var(--surface2)", color: "var(--ink2)", marginTop: 2 }}>
          <Icon name={icon} size={15} />
        </span>
        <div>
          <p className="bold txt-s">{title}</p>
          <p className="txt-xs muted">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="stack-l" style={{ maxWidth: 680 }}>
      <Reveal>
        <div>
          <h2 className="h1">Settings</h2>
          <p className="txt-s muted mt-s">Make HabitFlow feel like yours.</p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <section className="card pad-l">
          <p className="tag mb-s">Appearance</p>
          <Row icon={s.theme === "dark" ? "moonStar" : "sun"} title="Dark mode" sub="Easier on the eyes for late-night check-ins.">
            <Toggle checked={s.theme === "dark"} onChange={(v) => setSettings({ theme: v ? "dark" : "light" })} label="Dark mode" />
          </Row>
          <Row icon="calendar" title="Start week on" sub="Affects the calendar and weekly charts.">
            <div className="seg">
              <button className={`seg-btn ${s.weekStart === 1 ? "on" : ""}`} onClick={() => setSettings({ weekStart: 1 })}>Monday</button>
              <button className={`seg-btn ${s.weekStart === 0 ? "on" : ""}`} onClick={() => setSettings({ weekStart: 0 })}>Sunday</button>
            </div>
          </Row>
        </section>
      </Reveal>

      <Reveal delay={110}>
        <section className="card pad-l">
          <p className="tag mb-s">Reminders</p>
          <Row icon="bell" title="Browser notifications" sub="Get a system notification at each habit's reminder time.">
            <Toggle checked={s.notifications} onChange={askNotification} label="Browser notifications" />
          </Row>
          <Row icon="spark" title="Coach tips on dashboard" sub="Show a daily insight generated from your data.">
            <Toggle checked={s.coachTips} onChange={(v) => setSettings({ coachTips: v })} label="Coach tips" />
          </Row>
        </section>
      </Reveal>

      <Reveal delay={150}>
        <section className="card pad-l">
          <p className="tag mb-s">Data</p>
          <Row icon="cloud" title="Cloud sync" sub={cloudEnabled ? "Supabase connected — changes are saved to your account." : "Offline — add Supabase keys in frontend/.env to enable."}>
            <span className="badge" style={{ background: cloudEnabled ? "var(--leaf-soft)" : "var(--gold-soft)", color: cloudEnabled ? "var(--leaf-deep)" : "var(--gold-deep)" }}>
              {cloudEnabled ? "Connected" : "Off"}
            </span>
          </Row>
          <Row icon="download" title="Export data" sub="Download everything as JSON — it's your data.">
            <button
              className="btn btn-ghost btn-s"
              onClick={() => {
                exportJSON();
                toast("Export downloaded.", "ok");
              }}
            >
              <Icon name="download" size={14} /> Export JSON
            </button>
          </Row>
          <Row icon="refresh" title="Reset demo data" sub="Restore the sample habits and 10 weeks of history.">
            <button className="btn btn-danger btn-s" onClick={() => setConfirmReset(true)}>
              <Icon name="refresh" size={14} /> Reset
            </button>
          </Row>
        </section>
      </Reveal>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
        body="This replaces your current habits and history with the demo dataset. This can't be undone."
        confirmLabel="Reset everything"
        onConfirm={() => {
          onReset();
          toast("Demo data restored.", "info");
        }}
      />
    </div>
  );
}
