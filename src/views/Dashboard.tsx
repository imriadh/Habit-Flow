import { useMemo } from "react";
import type { Habit, NavFn } from "../types";
import { HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Bars, EmptyState, Reveal, Ring, useToast } from "../components/ui";
import { addDays, dkey, greeting, logKey, pct, relDay, today, WEEKDAYS_SHORT } from "../lib/dates";
import {
  coachTip,
  currentStreak,
  dayState,
  dayWin,
  habitLog,
  isScheduled,
  overallCurrentStreak,
  overallLongestStreak,
  recentActivity,
  weeklySeries,
} from "../lib/stats";

export function Dashboard({ nav, onAdd }: { nav: NavFn; onAdd: () => void }) {
  const { state, setLog } = useStore();
  const toast = useToast();
  const t = today();
  const tk = dkey(t);

  const due = useMemo(
    () =>
      state.habits
        .filter((h) => h.status === "active" && isScheduled(h, t))
        .sort((a, b) => {
          const sa = dayState(a, t, habitLog(state.logs, a.id, tk)) === "done" ? 1 : 0;
          const sb = dayState(b, t, habitLog(state.logs, b.id, tk)) === "done" ? 1 : 0;
          return sa - sb;
        }),
    [state, tk] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const doneCount = due.filter((h) => dayState(h, t, habitLog(state.logs, h.id, tk)) === "done").length;
  const progress = due.length ? doneCount / due.length : 0;
  const allDone = due.length > 0 && doneCount === due.length;

  const streak = useMemo(() => overallCurrentStreak(state), [state]);
  const bestStreak = useMemo(() => overallLongestStreak(state), [state]);
  const series = useMemo(() => weeklySeries(state, 8, state.settings.weekStart), [state]);
  const activity = useMemo(() => recentActivity(state, 6), [state]);
  const tip = useMemo(() => coachTip(state), [state]);

  const last7 = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(t, i - 6);
        return { d, w: dayWin(state, d) };
      }),
    [state] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const complete = (h: Habit) => {
    const st = dayState(h, t, habitLog(state.logs, h.id, tk));
    if (st === "done") {
      setLog(h.id, tk, h.goal ? { value: 0 } : null);
      return;
    }
    const entry = { done: true, skipped: false, ...(h.goal ? { value: h.goal.value } : {}) };
    setLog(h.id, tk, entry);
    const cs = currentStreak(h, { ...state.logs, [logKey(h.id, tk)]: entry });
    toast(cs >= 2 ? `${h.name} done — ${cs}-day streak!` : `${h.name} done. Nice.`, "ok");
  };

  const bump = (h: Habit, delta: number) => {
    if (!h.goal) return;
    const cur = habitLog(state.logs, h.id, tk)?.value ?? 0;
    const v = Math.max(0, Math.min(h.goal.value + 4, cur + delta));
    setLog(h.id, tk, { value: v, skipped: false });
    if (cur < h.goal.value && v >= h.goal.value) toast(`${h.name} goal reached — ${h.goal.value} ${h.goal.unit}!`, "ok");
  };

  const skip = (h: Habit) => {
    const log = habitLog(state.logs, h.id, tk);
    if (log?.skipped) setLog(h.id, tk, null);
    else setLog(h.id, tk, { skipped: true, done: false });
  };

  const firstName = state.profile.name.split(" ")[0];

  return (
    <div className="space-y-5">
      {/* greeting */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="disp text-3xl font-extrabold tracking-tight sm:text-4xl">
              {greeting()}, {firstName}
            </h2>
            <p className="mt-1 text-[15px] font-medium text-[var(--mut)]">
              {due.length === 0
                ? "Nothing scheduled today — a rare quiet day."
                : `You've completed ${doneCount} of ${due.length} habit${due.length === 1 ? "" : "s"} today.`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mut)]">
            <Icon name="clock" size={16} />
            <span>{relDay(t)} · week {series.length ? (series[series.length - 1].done + " / " + series[series.length - 1].scheduled) : ""}</span>
          </div>
        </div>
      </Reveal>

      {state.habits.filter((h) => h.status === "active").length === 0 ? (
        <Reveal delay={80}>
          <EmptyState icon="leaf" title="Plant your first habit" sub="No active habits yet. Start absurdly small — one habit you can do on your worst day.">
            <button className="btn btn-primary" onClick={onAdd}>
              <Icon name="plus" size={16} sw={2.4} /> Create a habit
            </button>
          </EmptyState>
        </Reveal>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ------------------------------ today board ----------------------------- */}
          <Reveal delay={60}>
            <section className="card overflow-hidden" aria-label="Today's habits">
              <div className="flex items-center gap-5 border-b border-[var(--line)] bg-[var(--surface2)] px-5 py-4 sm:px-6">
                <Ring value={progress} size={84} stroke={9}>
                  <span className="num text-xl">{Math.round(progress * 100)}%</span>
                </Ring>
                <div className="min-w-0">
                  <p className="tag">Today's progress</p>
                  <p className="disp mt-1 text-2xl font-extrabold leading-none">
                    {doneCount} <span className="text-[var(--mut)]">/ {due.length}</span>
                  </p>
                  <p className="mt-1.5 text-[13px] font-medium text-[var(--mut)]">
                    {allDone ? "Perfect day — every check-in closed." : due.length - doneCount === 1 ? "One more to close the day." : `${due.length - doneCount} check-ins still open.`}
                  </p>
                </div>
                {allDone && (
                  <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-[var(--gold-soft)] px-3 py-1.5 text-xs font-bold text-[var(--gold-deep)] sm:inline-flex">
                    <Icon name="spark" size={14} /> Perfect day
                  </span>
                )}
              </div>

              <ul>
                {due.length === 0 && (
                  <li className="px-6 py-10 text-center text-sm text-[var(--mut)]">
                    Rest day — no habits scheduled today. See you tomorrow.
                  </li>
                )}
                {due.map((h, i) => (
                  <HabitRow
                    key={h.id}
                    h={h}
                    index={i}
                    onToggle={() => complete(h)}
                    onBump={(d) => bump(h, d)}
                    onSkip={() => skip(h)}
                    onOpen={() => nav({ name: "habit", id: h.id })}
                  />
                ))}
              </ul>
            </section>
          </Reveal>

          {/* -------------------------------- right rail ----------------------------- */}
          <div className="space-y-5">
            <Reveal delay={120}>
              <section className="card p-5" aria-label="Streak">
                <div className="flex items-center justify-between">
                  <p className="tag">All-habit streak</p>
                  <span className="flame-live" style={{ color: streak > 0 ? "var(--gold)" : "var(--mut)" }}>
                    <Icon name="flame" size={26} sw={1.9} />
                  </span>
                </div>
                <p className="num mt-2 text-5xl leading-none">{streak}</p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--mut)]">
                  consecutive day{streak === 1 ? "" : "s"} · best ever {bestStreak}
                </p>
                <div className="mt-4 flex items-end justify-between gap-1.5">
                  {last7.map(({ d, w }, i) => {
                    const isT = i === 6;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                        <div
                          className="h-8 w-full rounded-md transition-colors"
                          title={`${relDay(d)}: ${w === true ? "perfect" : w === false ? "missed" : "—"}`}
                          style={{
                            background:
                              w === true ? "var(--leaf)" : w === false ? "var(--coral-soft)" : "var(--ring-track)",
                            boxShadow: w === true ? "0 4px 10px -4px var(--leaf)" : undefined,
                            outline: isT && w !== true ? "2px dashed var(--gold)" : undefined,
                            outlineOffset: 2,
                          }}
                        />
                        <span className={`text-[10px] font-bold ${isT ? "text-[var(--gold-deep)]" : "text-[var(--mut)]"}`}>
                          {WEEKDAYS_SHORT[d.getDay()]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </Reveal>

            <Reveal delay={180}>
              <section className="card p-5" aria-label="Weekly trend">
                <div className="mb-3 flex items-center justify-between">
                  <p className="tag">8-week trend</p>
                  <span className="rounded-full bg-[var(--leaf-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--leaf-deep)]">
                    {pct(series[series.length - 1]?.rate ?? null)} this week
                  </span>
                </div>
                <Bars
                  height={86}
                  data={series.map((s) => ({ label: s.label.split(" ")[0], value: s.rate, highlight: s.current }))}
                />
              </section>
            </Reveal>

            {state.settings.coachTips && (
              <Reveal delay={240}>
                <section className="card relative overflow-hidden p-5" aria-label="Coach insight">
                  <div className="absolute -right-6 -top-6 opacity-[0.12]" style={{ color: "var(--gold)" }}>
                    <Icon name="spark" size={110} sw={1.2} />
                  </div>
                  <p className="tag flex items-center gap-1.5">
                    <Icon name="spark" size={13} /> Coach insight
                  </p>
                  <p className="relative mt-2 text-[14px] font-semibold leading-snug">{tip}</p>
                  <button className="btn btn-ghost mt-4 !px-3 !py-1.5 !text-[13px]" onClick={() => nav({ name: "coach" })}>
                    Ask the coach <Icon name="chevR" size={14} />
                  </button>
                </section>
              </Reveal>
            )}

            <Reveal delay={300}>
              <section className="card p-5" aria-label="Recent activity">
                <p className="tag mb-3">Recent activity</p>
                {activity.length === 0 && <p className="text-sm text-[var(--mut)]">Nothing logged yet.</p>}
                <ul className="space-y-1">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface2)]">
                      <span
                        className="tile !h-8 !w-8 !rounded-lg"
                        style={{ background: HABIT_COLORS[a.habit.color]?.soft, color: HABIT_COLORS[a.habit.color]?.deep }}
                      >
                        <Icon name={a.habit.icon} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-tight">
                          {a.done ? "Completed" : "Logged"} {a.habit.name}
                          {a.value !== undefined && !a.done ? ` · ${a.value} ${a.habit.goal?.unit ?? ""}` : ""}
                        </p>
                        <p className="text-[11px] text-[var(--mut)]">{relDay(a.date)}</p>
                      </div>
                      {a.done && (
                        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--leaf)] text-white">
                          <Icon name="check" size={11} sw={2.8} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- habit row ------------------------------- */

function HabitRow({
  h,
  index,
  onToggle,
  onBump,
  onSkip,
  onOpen,
}: {
  h: Habit;
  index: number;
  onToggle: () => void;
  onBump: (d: number) => void;
  onSkip: () => void;
  onOpen: () => void;
}) {
  const { state } = useStore();
  const t = today();
  const tk = dkey(t);
  const log = habitLog(state.logs, h.id, tk);
  const st = dayState(h, t, log);
  const done = st === "done";
  const skipped = st === "skipped";
  const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
  const value = log?.value ?? 0;

  return (
    <li
      className={`hrow group flex items-center gap-3.5 border-b border-[var(--line)] px-4 py-3.5 last:border-b-0 sm:px-6 ${
        done ? "bg-[var(--leaf-soft)]/60" : skipped ? "opacity-60" : ""
      }`}
      style={{ transitionDelay: `${index * 30}ms` }}
    >
      <button
        className="tile cursor-pointer transition-transform group-hover:scale-105"
        style={{ background: c.soft, color: c.deep }}
        onClick={onOpen}
        aria-label={`Open ${h.name} details`}
        title="Open details"
      >
        <Icon name={h.icon} size={20} />
      </button>

      <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={onOpen}>
        <p className={`truncate text-[15px] font-bold leading-tight ${done ? "text-[var(--leaf-deep)]" : ""}`}>
          {h.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-[var(--mut)]">
          {skipped ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--gold-deep)]">
              <Icon name="pause" size={11} /> Skipped today — streak protected
            </span>
          ) : h.goal ? (
            <>
              <Icon name="target" size={12} />
              {Math.min(value, h.goal.value)} / {h.goal.value} {h.goal.unit}
            </>
          ) : (
            <>
              {h.reminder && (
                <>
                  <Icon name="clock" size={12} /> {h.reminder}
                </>
              )}
              {done && <span className="font-semibold text-[var(--leaf-deep)]">Completed</span>}
            </>
          )}
        </p>
      </button>

      {h.goal && !skipped && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <button className="step-btn" onClick={() => onBump(-1)} aria-label={`Decrease ${h.name}`}>
            <Icon name="minus" size={14} sw={2.4} />
          </button>
          <span className="num w-8 text-center text-lg leading-none">{value}</span>
          <button className="step-btn" onClick={() => onBump(1)} aria-label={`Increase ${h.name}`}>
            <Icon name="plus" size={14} sw={2.4} />
          </button>
        </div>
      )}

      {!skipped && (
        <button
          className={`checkbtn ${done ? "on" : ""}`}
          style={{ ["--cb" as never]: c.base }}
          onClick={onToggle}
          aria-pressed={done}
          aria-label={`Mark ${h.name} ${done ? "not done" : "done"}`}
          title={done ? "Undo" : "Mark done"}
        >
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <span key={a} className="b" style={{ ["--a" as never]: `${a}deg` }} />
          ))}
        </button>
      )}

      <button
        className="text-[11px] font-bold text-[var(--mut)] underline-offset-2 transition-colors hover:text-[var(--gold-deep)] hover:underline"
        onClick={onSkip}
        title={skipped ? "Undo skip" : "Skip today (protects your streak)"}
      >
        {skipped ? "Undo" : "Skip"}
      </button>
    </li>
  );
}
