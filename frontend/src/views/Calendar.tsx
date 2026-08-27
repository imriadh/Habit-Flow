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
    .filter((h) => h.status === "active" && isScheduled(h, selDate))
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
    } else toast(`${h.name} marked for ${selDate.getDate()} ${MONTHS[selDate.getMonth()].slice(0, 3)}.`, "ok");
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
    <div className="stack-l">
      <Reveal>
        <div className="row wrap spread">
          <div>
            <h2 className="h1">
              {MONTHS[month.getMonth()]} <span className="muted">{month.getFullYear()}</span>
            </h2>
            <p className="txt-s muted mt-s">
              {monthRate === null
                ? "Nothing scheduled this month."
                : `${pct(monthRate)} of scheduled check-ins completed${filter !== "all" ? " for this habit" : ""}.`}
            </p>
          </div>
          <div className="row-s wrap">
            <select className="input" style={{ width: "auto", padding: "8px 10px", fontSize: 13, fontWeight: 600 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter calendar by habit">
              <option value="all">All habits</option>
              {state.habits.filter((h) => h.status !== "archived").map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
              <Icon name="chevL" size={17} />
            </button>
            <button
              className="btn btn-ghost btn-s"
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

      <div className="split">
        <Reveal delay={60}>
          <section className="card pad-l" aria-label="Month grid">
            <div className="cal-grid mb-s">
              {dayOrder.map((d) => (
                <div key={d} className="cal-head">{WEEKDAYS_SHORT[d]}</div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((c, i) =>
                c === null ? (
                  <div key={`x${i}`} />
                ) : (
                  <button
                    key={c.k}
                    className="cal-cell"
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
                    {cellStyle(c.d, c.k).dot && <span className="cal-dot" style={{ background: cellStyle(c.d, c.k).dot! }} />}
                  </button>
                )
              )}
            </div>
            <div className="legend">
              <span><span className="legend-dot" style={{ background: "var(--leaf)" }} />All done</span>
              <span><span className="legend-dot" style={{ background: "var(--gold)" }} />Partial</span>
              <span><span className="legend-dot" style={{ background: "var(--coral)" }} />Missed</span>
              <span><span className="legend-dot" style={{ background: "var(--line2)" }} />Not scheduled</span>
            </div>
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="card pad-l" aria-label="Day details">
            <p className="tag">{selIsFuture ? "Upcoming" : win === true ? "Perfect day" : win === false ? "Incomplete" : "Rest day"}</p>
            <h3 className="h2 mt-s">{fmtLong(selDate)}</h3>

            {!selIsFuture && dueSel.length > 0 && (
              <p className="txt-s bold muted mt-s">
                {dueSel.filter((h) => dayState(h, selDate, habitLog(state.logs, h.id, selected)) === "done").length} of {dueSel.length} completed
              </p>
            )}

            <div className="stack-s mt-m">
              {dueSel.length === 0 && (
                <div style={{ border: "1.5px dashed var(--line2)", borderRadius: 12, padding: "24px 16px", textAlign: "center", fontSize: 13, fontWeight: 500, color: "var(--mut)" }}>
                  {selIsFuture ? "Nothing scheduled yet." : "No habits were scheduled this day."}
                </div>
              )}
              {dueSel.map((h) => {
                const st = dayState(h, selDate, habitLog(state.logs, h.id, selected));
                const log = habitLog(state.logs, h.id, selected);
                const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
                const meta: [string, string, string] =
                  st === "done"
                    ? ["Done", "var(--leaf-soft)", "var(--leaf-deep)"]
                    : st === "partial"
                      ? [`Partial${h.goal ? ` · ${log?.value ?? 0}/${h.goal.value}` : ""}`, "var(--gold-soft)", "var(--gold-deep)"]
                      : st === "skipped"
                        ? ["Skipped", "var(--pine-soft)", "var(--pine-deep)"]
                        : st === "missed"
                          ? ["Missed", "var(--coral-soft)", "var(--coral-deep)"]
                          : ["Pending", "var(--surface2)", "var(--mut)"];
                return (
                  <div key={h.id} className="day-item">
                    <div className="row-s">
                      <span className="tile tile-s" style={{ background: c.soft, color: c.deep }}>
                        <Icon name={h.icon} size={16} />
                      </span>
                      <div className="grow">
                        <p className="bold txt-s clip" style={{ lineHeight: 1.25 }}>{h.name}</p>
                        <span className="badge mt-s" style={{ background: meta[1], color: meta[2], fontSize: 10, padding: "2px 8px" }}>
                          {meta[0]}
                        </span>
                      </div>
                      {!selIsFuture && st !== "skipped" && (
                        <button
                          className={`checkbtn checkbtn-sm ${st === "done" ? "on" : ""}`}
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
                      <div className="row-xs mt-s">
                        <button className="step-btn" style={{ width: 27, height: 27 }} onClick={() => bump(h, -1)} aria-label="Decrease">
                          <Icon name="minus" size={12} sw={2.6} />
                        </button>
                        <div className="bar grow" style={{ height: 6 }}>
                          <span className="bar-i" style={{ width: `${Math.min(100, ((log?.value ?? 0) / h.goal.value) * 100)}%`, background: c.base }} />
                        </div>
                        <span className="num txt-s" style={{ width: 24, textAlign: "center" }}>{log?.value ?? 0}</span>
                        <button className="step-btn" style={{ width: 27, height: 27 }} onClick={() => bump(h, 1)} aria-label="Increase">
                          <Icon name="plus" size={12} sw={2.6} />
                        </button>
                      </div>
                    )}
                    {!selIsFuture && (
                      <button
                        className="txt-xs bold muted mt-s"
                        style={{ border: "none", background: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                        onClick={() => skipDay(h)}
                      >
                        {st === "skipped" ? "Undo skip" : "Mark as skipped"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="card-foot txt-xs muted">
              Tip: click any past day to fix history — streaks and stats update instantly.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
