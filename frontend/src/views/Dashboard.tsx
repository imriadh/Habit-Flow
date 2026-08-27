import { useMemo } from "react";
import type { DayState, Habit, LogEntry, NavFn } from "../types";
import { HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Bars, EmptyState, Reveal, Ring, useToast } from "../components/ui";
import { dkey, fmtSchedule, greeting, logKey, pct, today } from "../lib/dates";
import {
  coachTips,
  currentStreak,
  dayState,
  dayWin,
  habitLog,
  isScheduled,
  overallCurrentStreak,
  overallLongestStreak,
  weeklySeries,
} from "../lib/stats";

export function Dashboard({ nav, onAdd }: { nav: NavFn; onAdd: () => void }) {
  const { state, setLog } = useStore();
  const toast = useToast();
  const t = today();
  const tk = dkey(t);
  const { settings } = state;

  const dueToday = useMemo(
    () => state.habits.filter((h) => h.status === "active" && isScheduled(h, t)),
    [state.habits, tk] // eslint-disable-line react-hooks/exhaustive-de
  );

  const counts = useMemo(() => {
    let done = 0, partial = 0, skipped = 0;
    for (const h of dueToday) {
      const st = dayState(h, t, habitLog(state.logs, h.id, tk));
      if (st === "done") done++;
      else if (st === "partial") partial++;
      else if (st === "skipped") skipped++;
    }
    return { done, partial, skipped, total: dueToday.length };
  }, [dueToday, state.logs, tk]);

  const dayRate = counts.total ? (counts.done + counts.partial * 0.5) / counts.total : 0;
  const streak = overallCurrentStreak(state);
  const longest = overallLongestStreak(state);
  const week = weeklySeries(state, 7, settings.weekStart);
  const win = dayWin(state, t);
  const tips = useMemo(() => (settings.coachTips ? coachTips(state) : []), [state, settings.coachTips]);

  const recent = useMemo(() => {
    const items: { id: string; habit: Habit; when: number; entry: LogEntry }[] = [];
    for (const k in state.logs) {
      const e = state.logs[k];
      if (!e.at) continue;
      const [hid] = k.split("|");
      const habit = state.habits.find((h) => h.id === hid);
      if (habit) items.push({ id: k, habit, when: e.at, entry: e });
    }
    return items.sort((a, b) => b.when - a.when).slice(0, 5);
  }, [state]);

  const toggle = (h: Habit) => {
    const log = habitLog(state.logs, h.id, tk);
    const st = dayState(h, t, log);
    if (st === "done") {
      if (h.goal) setLog(h.id, tk, { value: 0 });
      else setLog(h.id, tk, null);
      return;
    }
    setLog(h.id, tk, { done: true, skipped: false, ...(h.goal ? { value: h.goal.value } : {}) });
    const cs = currentStreak(h, { ...state.logs, [logKey(h.id, tk)]: { done: true } });
    toast(
      cs >= 2 ? `${h.name} done — ${cs}-day streak!` : `${h.name} done for today.`,
      "ok"
    );
  };

  const bump = (h: Habit, delta: number) => {
    if (!h.goal) return;
    const cur = habitLog(state.logs, h.id, tk)?.value ?? 0;
    const next = Math.max(0, Math.min(h.goal.value + 4, cur + delta));
    setLog(h.id, tk, { value: next, skipped: false });
    if (cur < h.goal.value && next >= h.goal.value) toast(`${h.name} goal hit — ${h.goal.value} ${h.goal.unit}!`, "ok");
  };

  const skip = (h: Habit) => {
    const log = habitLog(state.logs, h.id, tk);
    if (log?.skipped) {
      setLog(h.id, tk, null);
      return;
    }
    setLog(h.id, tk, { skipped: true, done: false });
    toast(`${h.name} skipped — your streak is safe.`, "info");
  };

  const firstName = state.profile.name.split(" ")[0];

  return (
    <div className="stack-l">
      {/* ------------------------------- today hero ------------------------------ */}
      <Reveal>
        <section className="card pad-xl" aria-label="Today's progress">
          <div className="row-l wrap top">
            <div className="grow stack-s" style={{ minWidth: 240 }}>
              <div>
                <h1 className="h1">
                  {greeting()}, {firstName}
                  {streak >= 3 && (
                    <span className="flame-live" style={{ display: "inline-block", marginLeft: 10, color: "var(--gold)" }}>
                      <Icon name="flame" size={26} sw={2} />
                    </span>
                  )}
                </h1>
                <p className="txt-s muted mt-s">
                  {counts.total === 0
                    ? "Nothing scheduled today — a rare free day. Enjoy it."
                    : win === true
                      ? `All ${counts.total} habits complete. Perfect day — go enjoy your evening.`
                      : `You've completed ${counts.done} of ${counts.total} habits today.`}
                </p>
              </div>
              {dueToday.length > 0 && win !== true && (
                <div className="bar" style={{ maxWidth: 340, height: 10 }}>
                  <span className="bar-i" style={{ width: `${dayRate * 100}%`, background: "linear-gradient(90deg, var(--leaf), var(--teal))" }} />
                </div>
              )}
            </div>

            <div className="row wrap" style={{ gap: 12 }}>
              <Ring value={dayRate} size={132} stroke={11} color={win === true ? "var(--gold)" : "var(--leaf)"}>
                <div style={{ textAlign: "center" }}>
                  <p className="num" style={{ fontSize: 30, lineHeight: 1 }}>
                    {counts.total ? `${counts.done}/${counts.total}` : "—"}
                  </p>
                  <p className="txt-xs muted bold" style={{ marginTop: 3 }}>
                    {pct(dayRate)} today
                  </p>
                </div>
              </Ring>
              <div className="stack-s">
                <MiniStat icon="flame" label="Current streak" value={`${streak}d`} tone="gold" pulse={streak >= 3} />
                <MiniStat icon="target" label="Best streak" value={`${longest}d`} tone="teal" />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="split">
        {/* ------------------------------ today's habits ----------------------------- */}
        <div className="stack">
          <Reveal delay={60}>
            <div className="row spread">
              <h2 className="h2">Today's habits</h2>
              <button className="btn btn-ghost btn-s" onClick={onAdd}>
                <Icon name="plus" size={14} sw={2.4} /> Quick add
              </button>
            </div>
          </Reveal>

          {dueToday.length === 0 ? (
            <Reveal delay={100}>
              <EmptyState icon="leaf" title="No habits yet" sub="Plant your first habit — tiny ones count. Try “Read 10 pages” or “Drink 8 glasses of water”.">
                <button className="btn btn-primary" onClick={onAdd}>
                  <Icon name="plus" size={16} sw={2.4} /> Create your first habit
                </button>
              </EmptyState>
            </Reveal>
          ) : (
            dueToday.map((h, i) => (
              <Reveal key={h.id} delay={100 + i * 50}>
                <HabitRow h={h} st={dayState(h, t, habitLog(state.logs, h.id, tk))} log={habitLog(state.logs, h.id, tk)} onToggle={() => toggle(h)} onBump={(d) => bump(h, d)} onSkip={() => skip(h)} onOpen={() => nav({ name: "habit", id: h.id })} />
              </Reveal>
            ))
          )}
        </div>

        {/* --------------------------------- right rail ------------------------------ */}
        <div className="stack">
          <Reveal delay={120}>
            <section className="card pad-l" aria-label="Weekly progress">
              <p className="tag mb-s">This week</p>
              <Bars data={week} height={96} />
            </section>
          </Reveal>

          {tips.length > 0 && (
            <Reveal delay={170}>
              <section className="card pad-l" aria-label="Coach tip">
                <div className="row-s spread mb-s">
                  <p className="tag" style={{ color: "var(--gold-deep)" }}>Coach insight</p>
                  <button className="txt-xs bold" style={{ border: "none", background: "none", color: "var(--leaf-deep)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }} onClick={() => nav({ name: "coach" })}>
                    Open coach
                  </button>
                </div>
                <p className="txt-s soft" style={{ lineHeight: 1.6 }}>
                  <span style={{ color: "var(--gold-deep)", marginRight: 6, display: "inline-block", verticalAlign: -3 }}>
                    <Icon name="spark" size={15} />
                  </span>
                  {tips[0]}
                </p>
              </section>
            </Reveal>
          )}

          <Reveal delay={220}>
            <section className="card pad-l" aria-label="Recent activity">
              <p className="tag mb-s">Recent activity</p>
              {recent.length === 0 && <p className="txt-s muted">Check-ins will show up here.</p>}
              <div className="stack-s">
                {recent.map((r) => {
                  const c = HABIT_COLORS[r.habit.color] ?? HABIT_COLORS.leaf;
                  const when = new Date(r.when);
                  return (
                    <div key={r.id} className="row-s">
                      <span className="tile tile-s" style={{ background: c.soft, color: c.deep }}>
                        <Icon name={r.entry.done ? "check" : r.entry.skipped ? "pause" : "clock"} size={14} />
                      </span>
                      <span className="grow clip txt-s bold">{r.habit.name}</span>
                      <span className="txt-xs muted mono-time">
                        {r.entry.skipped ? "skipped" : r.entry.done ? (r.entry.value !== undefined ? `${r.entry.value} ✓` : "done") : `partial${r.entry.value !== undefined ? ` ${r.entry.value}` : ""}`}
                      </span>
                      <span className="txt-xs muted mono-time">
                        {String(when.getHours()).padStart(2, "0")}:{String(when.getMinutes()).padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone, pulse }: { icon: string; label: string; value: string; tone: "gold" | "teal"; pulse?: boolean }) {
  const soft = tone === "gold" ? "var(--gold-soft)" : "var(--teal-soft)";
  const deep = tone === "gold" ? "var(--gold-deep)" : "var(--teal-deep)";
  return (
    <div className="row-s card pad-s" style={{ minWidth: 150 }}>
      <span className={`tile tile-s ${pulse ? "pulse-soft" : ""}`} style={{ background: soft, color: deep }}>
        <Icon name={icon} size={15} />
      </span>
      <div>
        <p className="num" style={{ fontSize: 18, lineHeight: 1.1 }}>{value}</p>
        <p className="txt-xs muted bold">{label}</p>
      </div>
    </div>
  );
}

function HabitRow({
  h,
  st,
  log,
  onToggle,
  onBump,
  onSkip,
  onOpen,
}: {
  h: Habit;
  st: DayState;
  log?: LogEntry;
  onToggle: () => void;
  onBump: (delta: number) => void;
  onSkip: () => void;
  onOpen: () => void;
}) {
  const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
  const done = st === "done";
  const skipped = st === "skipped";
  const val = log?.value ?? 0;
  const goalPct = h.goal ? Math.min(1, val / h.goal.value) : 0;

  return (
    <article className={`card hrow ${done || skipped ? "" : ""}`} style={{ opacity: skipped ? 0.66 : 1, cursor: "pointer" }} onClick={onOpen}>
      <div className="row pad" style={{ gap: 14 }}>
        <span className="tile" style={{ background: c.soft, color: c.deep }}>
          <Icon name={h.icon} size={20} />
        </span>

        <div className="grow">
          <div className="row-xs">
            <h3 className="bold clip" style={{ fontSize: 15, textDecoration: skipped ? "line-through" : "none" }}>
              {h.name}
            </h3>
            {skipped && (
              <span className="badge" style={{ background: "var(--pine-soft)", color: "var(--pine-deep)" }}>
                skipped
              </span>
            )}
          </div>
          {h.goal ? (
            <div className="row-xs mt-s" onClick={(e) => e.stopPropagation()}>
              <button className="step-btn" onClick={() => onBump(-1)} aria-label={`Decrease ${h.name}`} disabled={done}>
                <Icon name="minus" size={13} sw={2.6} />
              </button>
              <div className="bar grow" style={{ height: 7 }}>
                <span className="bar-i" style={{ width: `${goalPct * 100}%`, background: done ? c.base : "var(--gold)" }} />
              </div>
              <span className="num txt-s" style={{ minWidth: 58, textAlign: "right", color: done ? c.deep : "var(--ink2)" }}>
                {val}/{h.goal.value} {h.goal.unit}
              </span>
              <button className="step-btn" onClick={() => onBump(1)} aria-label={`Increase ${h.name}`} disabled={done}>
                <Icon name="plus" size={13} sw={2.6} />
              </button>
            </div>
          ) : (
            <p className="txt-xs muted mt-s">
              {fmtSchedule(h.weekdays)}
              {h.reminder ? ` · ${h.reminder}` : ""}
            </p>
          )}
        </div>

        <div className="row-xs" onClick={(e) => e.stopPropagation()} style={{ flex: "none" }}>
          {!h.goal && !skipped && (
            <button className="txt-xs bold" style={{ border: "none", background: "none", color: "var(--mut)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }} onClick={onSkip}>
              skip
            </button>
          )}
          <button
            className={`checkbtn ${done ? "on" : ""}`}
            style={{ ["--cb" as never]: c.base }}
            onClick={done ? onToggle : h.goal ? () => onBump(h.goal!.value - val) : onToggle}
            aria-pressed={done}
            aria-label={`Mark ${h.name} done`}
            title={h.goal && !done ? "Log full amount" : undefined}
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <span key={a} className="b" style={{ ["--a" as never]: `${a}deg` }} />
            ))}
          </button>
        </div>
      </div>
    </article>
  );
}
