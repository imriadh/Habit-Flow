import { useMemo, useState, type CSSProperties } from "react";
import type { Habit } from "../types";
import { HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Reveal, useToast } from "../components/ui";
import { addDays, dkey, fmtLong, isToday, logKey, MONTHS, parseKey, pct, today, WEEKDAYS_SHORT } from "../lib/dates";
import { currentStreak, dayState, dayWin, habitLog, isScheduled } from "../lib/stats";

export function CalendarView() {
  const { state, setLog } = useStore();
  const toast = useToast();
  const [month, setMonth] = useState(() => {
    const t = today();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selected, setSelected] = useState(dkey(today()));
  const [filterRaw, setFilter] = useState<string>("all");

  const ws = state.settings.weekStart;
  const dayOrder = ws === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const tk = dkey(today());
  // fall back to "all" if the filtered habit was archived/deleted meanwhile
  const filter = filterRaw !== "all" && !state.habits.some((h) => h.id === filterRaw) ? "all" : filterRaw;

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() - ws + 7) % 7;
    const out: ({ d: Date; k: string } | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(month.getFullYear(), month.getMonth(), i);
      out.push({ d, k: dkey(d) });
    }
    return out;
  }, [month, ws]);

  const monthRate = useMemo(() => {
    let done = 0;
    let scheduled = 0;
    const t = today();
    for (const c of cells) {
      if (!c || c.d > t) continue;
      for (const h of state.habits) {
        if (h.status !== "active") continue;
        if (!isScheduled(h, c.d)) continue;
        if (filter !== "all" && h.id !== filter) continue;
        const st = dayState(h, c.d, habitLog(state.logs, h.id, c.k));
        if (st === "skipped") continue;
        scheduled++;
        if (st === "done") done++;
      }
    }
    return scheduled ? done / scheduled : null;
  }, [cells, state, filter]);

  const cellStyle = (d: Date, k: string): { style: CSSProperties; dot: string | null } => {
    const future = k > tk;
    if (filter !== "all") {
      const h = state.habits.find((x) => x.id === filter)!;
      const st = dayState(h, d, habitLog(state.logs, h.id, k));
      switch (st) {
        case "done": return { style: { background: "var(--leaf-soft)", color: "var(--leaf-deep)" }, dot: "var(--leaf)" };
        case "partial": return { style: { background: "var(--gold-soft)", color: "var(--gold-deep)" }, dot: "var(--gold)" };
        case "skipped": return { style: { background: "var(--pine-soft)", color: "var(--pine-deep)" }, dot: "var(--pine)" };
        case "missed": return { style: { background: "var(--coral-soft)", color: "var(--coral-deep)" }, dot: "var(--coral)" };
        case "pending": return { style: { outline: "2px dashed var(--leaf)", outlineOffset: -2 }, dot: null };
        default: return { style: { background: "var(--surface2)", color: "var(--mut)" }, dot: null };
      }
    }
    const due = state.habits.filter((h) => h.status === "active" && isScheduled(h, d));
    if (due.length === 0 || future) return { style: { background: "var(--surface2)", color: future ? "var(--mut)" : "var(--ink2)" }, dot: null };
    let done = 0;
    let counted = 0;
    for (const h of due) {
      const st = dayState(h, d, habitLog(state.logs, h.id, k));
      if (st === "skipped") continue;
      counted++;
      if (st === "done") done++;
    }
    if (counted === 0) return { style: { background: "var(--surface2)" }, dot: null };
    const rate = done / counted;
    if (rate >= 1) return { style: { background: "var(--leaf-soft)", color: "var(--leaf-deep)" }, dot: "var(--leaf)" };
    if (rate >= 0.5) return { style: { background: "var(--gold-soft)", color: "var(--gold-deep)" }, dot: "var(--gold)" };
    return { style: { background: "var(--coral-soft)", color: "var(--coral-deep)" }, dot: "var(--coral)" };
  };

  const selDate = parseKey(selected);
  const selIsFuture = selected > tk;
  const win = dayWin(state, selDate);
  const dueSel = state.habits
    .filter((h) => h.status !== "archived" && h.status === "active" && isScheduled(h, selDate))
    .filter((h) => filter === "all" || h.id === filter);

  const toggle = (h: Habit) => {
    const st = dayState(h, selDate, habitLog(state.logs, h.id, selected));
    if (st === "done") {
      setLog(h.id, selected, h.goal ? { value: 0 } : null);
      return;
    }
    setLog(h.id, selected, { done: true, skipped: false, ...(h.goal ? { value: h.goal.value } : {}) });
    if (selected === tk) {
      const cs = currentStreak(h, { ...state.logs, [logKey(h.id, selected)]: { done: true } });
      toast(cs >= 2 ? `${h.name} done — ${cs}-day streak!` : `${h.name} done.`, "ok");
    } else toast(`${h.name} marked for ${fmtShort(selDate)}.`, "ok");
  };

  const bump = (h: Habit, delta: number) => {
    if (!h.goal) return;
    const cur = habitLog(state.logs, h.id, selected)?.value ?? 0;
    setLog(h.id, selected, { value: Math.max(0, Math.min(h.goal.value + 4, cur + delta)), skipped: false });
  };

  const skipDay = (h: Habit) => {
    const log = habitLog(state.logs, h.id, selected);
    if (log?.skipped) setLog(h.id, selected, null);
    else setLog(h.id, selected, { skipped: true, done: false });
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">
              {MONTHS[month.getMonth()]} <span className="text-[var(--mut)]">{month.getFullYear()}</span>
            </h2>
            <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">
              {monthRate === null ? "Nothing scheduled this month." : `${pct(monthRate)} of scheduled check-ins completed${filter !== "all" ? " for this habit" : ""}.`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="input !w-auto !py-2 text-[13px] font-semibold"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter calendar by habit"
            >
              <option value="all">All habits</option>
              {state.habits.filter((h) => h.status !== "archived").map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
              <Icon name="chevL" size={17} />
            </button>
            <button
              className="btn btn-ghost !px-3 !py-2 !text-[13px]"
              onClick={() => {
                const t = today();
                setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
                setSelected(dkey(t));
              }}
            >
              Today
            </button>
            <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
              <Icon name="chevR" size={17} />
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <Reveal delay={60}>
          <section className="card p-4 sm:p-5" aria-label="Month grid">
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {dayOrder.map((d) => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">
                  {WEEKDAYS_SHORT[d]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((c, i) =>
                c === null ? (
                  <div key={`x${i}`} />
                ) : (
                  <button
                    key={c.k}
                    className={`cal-cell ${selected === c.k ? "!shadow-[var(--shadow-lg)]" : ""}`}
                    style={{
                      ...cellStyle(c.d, c.k).style,
                      outline: isToday(c.d)
                        ? "2px solid var(--leaf)"
                        : selected === c.k
                          ? "2px solid var(--ink)"
                          : cellStyle(c.d, c.k).style.outline,
                      outlineOffset: -2,
                      fontWeight: isToday(c.d) || selected === c.k ? 800 : 600,
                    }}
                    onClick={() => setSelected(c.k)}
                    aria-pressed={selected === c.k}
                    aria-label={fmtLong(c.d)}
                  >
                    {c.d.getDate()}
                    {cellStyle(c.d, c.k).dot && (
                      <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full" style={{ background: cellStyle(c.d, c.k).dot! }} />
                    )}
                  </button>
                )
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] pt-3.5 text-[11px] font-semibold text-[var(--mut)]">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--leaf)]" /> All done</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" /> Partial</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--coral)]" /> Missed</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--line2)]" /> Not scheduled</span>
            </div>
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="card p-5" aria-label="Day details">
            <p className="tag">{selIsFuture ? "Upcoming" : win === true ? "Perfect day" : win === false ? "Incomplete" : "Rest day"}</p>
            <h3 className="disp mt-1 text-xl font-extrabold leading-tight">{fmtLong(selDate)}</h3>

            {!selIsFuture && dueSel.length > 0 && (
              <p className="mt-1 text-[13px] font-semibold text-[var(--mut)]">
                {dueSel.filter((h) => dayState(h, selDate, habitLog(state.logs, h.id, selected)) === "done").length} of {dueSel.length} completed
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {dueSel.length === 0 && (
                <li className="rounded-xl border border-dashed border-[var(--line2)] px-4 py-6 text-center text-[13px] font-medium text-[var(--mut)]">
                  {selIsFuture ? "Nothing scheduled yet." : "No habits were scheduled this day."}
                </li>
              )}
              {dueSel.map((h) => {
                const st = dayState(h, selDate, habitLog(state.logs, h.id, selected));
                const log = habitLog(state.logs, h.id, selected);
                const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
                const meta = {
                  done: ["Done", "var(--leaf-soft)", "var(--leaf-deep)"],
                  partial: [`Partial${h.goal ? ` · ${log?.value ?? 0}/${h.goal.value}` : ""}`, "var(--gold-soft)", "var(--gold-deep)"],
                  skipped: ["Skipped", "var(--pine-soft)", "var(--pine-deep)"],
                  missed: ["Missed", "var(--coral-soft)", "var(--coral-deep)"],
                  pending: ["Pending", "var(--surface2)", "var(--mut)"],
                  unscheduled: ["—", "var(--surface2)", "var(--mut)"],
                  future: ["Upcoming", "var(--surface2)", "var(--mut)"],
                }[st];
                return (
                  <li key={h.id} className="rounded-xl border border-[var(--line)] p-3 transition-shadow hover:shadow-[var(--shadow)]">
                    <div className="flex items-center gap-2.5">
                      <span className="tile !h-9 !w-9 !rounded-lg" style={{ background: c.soft, color: c.deep }}>
                        <Icon name={h.icon} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold leading-tight">{h.name}</p>
                        <span className="mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: meta[1] as string, color: meta[2] as string }}>
                          {meta[0]}
                        </span>
                      </div>
                      {!selIsFuture && h.status === "active" && st !== "skipped" && (
                        <button
                          className={`checkbtn !h-8 !w-8 !rounded-lg ${st === "done" ? "on" : ""}`}
                          style={{ ["--cb" as never]: c.base }}
                          onClick={() => toggle(h)}
                          aria-pressed={st === "done"}
                          aria-label={`Toggle ${h.name} on ${selected}`}
                        >
                          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                        </button>
                      )}
                    </div>
                    {!selIsFuture && h.goal && st !== "skipped" && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button className="step-btn !h-7 !w-7" onClick={() => bump(h, -1)} aria-label="Decrease">
                          <Icon name="minus" size={12} sw={2.6} />
                        </button>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, ((log?.value ?? 0) / h.goal.value) * 100)}%`, background: c.base }}
                          />
                        </div>
                        <span className="num w-7 text-center text-sm">{log?.value ?? 0}</span>
                        <button className="step-btn !h-7 !w-7" onClick={() => bump(h, 1)} aria-label="Increase">
                          <Icon name="plus" size={12} sw={2.6} />
                        </button>
                      </div>
                    )}
                    {!selIsFuture && h.status === "active" && (
                      <button className="mt-2 text-[11px] font-bold text-[var(--mut)] underline-offset-2 hover:text-[var(--gold-deep)] hover:underline" onClick={() => skipDay(h)}>
                        {st === "skipped" ? "Undo skip" : "Mark as skipped"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] font-medium text-[var(--mut)]">
              Tip: click any past day to fix history — streaks and stats update instantly.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function fmtShort(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
