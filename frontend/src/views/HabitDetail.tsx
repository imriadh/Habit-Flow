import { useMemo, useState, type CSSProperties } from "react";
import type { NavFn } from "../types";
import { CATEGORIES, HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { ConfirmModal, EmptyState, Reveal, useToast } from "../components/ui";
import { addDays, dkey, fmtMedium, fmtSchedule, fmtShort, parseKey, pct, relDay, startOfWeek, today, WEEKDAYS_SHORT } from "../lib/dates";
import { dayState, habitLog, habitStats, lastNDays } from "../lib/stats";

const STATE_META: Record<string, { label: string; bg: string; color: string }> = {
  done: { label: "Done", bg: "var(--leaf-soft)", color: "var(--leaf-deep)" },
  partial: { label: "Partial", bg: "var(--gold-soft)", color: "var(--gold-deep)" },
  skipped: { label: "Skipped", bg: "var(--pine-soft)", color: "var(--pine-deep)" },
  missed: { label: "Missed", bg: "var(--coral-soft)", color: "var(--coral-deep)" },
  pending: { label: "Pending", bg: "var(--surface2)", color: "var(--mut)" },
  unscheduled: { label: "—", bg: "var(--surface2)", color: "var(--mut)" },
  future: { label: "—", bg: "var(--surface2)", color: "var(--mut)" },
};

export function HabitDetail({ id, nav, onEdit }: { id: string; nav: NavFn; onEdit: (id: string) => void }) {
  const { state, updateHabit, removeHabit, setLog } = useStore();
  const toast = useToast();
  const [confirm, setConfirm] = useState<"delete" | "archive" | null>(null);

  const h = state.habits.find((x) => x.id === id);

  const stats = useMemo(() => (h ? habitStats(state, h) : null), [state, h]);
  const days = useMemo(() => (h ? lastNDays(state, h, 14) : []), [state, h]);

  const heat = useMemo(() => {
    if (!h) return [];
    const ws = state.settings.weekStart;
    const thisWeek = startOfWeek(today(), ws);
    const cols: { date: Date; st: string }[][] = [];
    for (let w = 11; w >= 0; w--) {
      const col: { date: Date; st: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(addDays(thisWeek, -7 * w), (i + ws) % 7);
        col.push({ date: d, st: dayState(h, d, habitLog(state.logs, h.id, dkey(d))) });
      }
      cols.push(col);
    }
    return cols;
  }, [state, h]);

  if (!h || !stats) {
    return (
      <EmptyState icon="search" title="Habit not found" sub="It may have been deleted. Head back to your habits.">
        <button className="btn btn-ghost" onClick={() => nav({ name: "habits" })}>
          <Icon name="arrowL" size={15} /> Back to habits
        </button>
      </EmptyState>
    );
  }

  const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
  const tk = dkey(today());
  const stToday = dayState(h, today(), habitLog(state.logs, h.id, tk));
  void stToday;

  const cellStyle = (st: string): CSSProperties => {
    switch (st) {
      case "done":
        return { background: c.base, boxShadow: `0 2px 6px -2px ${c.base}` };
      case "partial":
        return { background: "var(--gold)" };
      case "skipped":
        return { background: "var(--line2)" };
      case "missed":
        return { background: "var(--coral-soft)", outline: "1px solid var(--coral)", outlineOffset: -1 };
      case "pending":
        return { background: "var(--surface)", outline: `1.5px dashed ${c.base}`, outlineOffset: -1.5 };
      default:
        return { background: "var(--surface2)" };
    }
  };

  return (
    <div className="stack-l">
      <Reveal>
        <button className="btn btn-ghost btn-s" onClick={() => nav({ name: "habits" })}>
          <Icon name="arrowL" size={14} /> All habits
        </button>
      </Reveal>

      {/* header */}
      <Reveal delay={50}>
        <section className="card pad-xl">
          <div className="row-l wrap top">
            <span className="tile tile-l" style={{ background: c.soft, color: c.deep }}>
              <Icon name={h.icon} size={26} />
            </span>
            <div className="grow stack-xs" style={{ minWidth: 240 }}>
              <div className="row-s wrap">
                <h2 className="h1">{h.name}</h2>
                <span className="badge" style={{ background: h.status === "active" ? "var(--leaf-soft)" : "var(--gold-soft)", color: h.status === "active" ? "var(--leaf-deep)" : "var(--gold-deep)" }}>
                  {h.status === "active" ? "Active" : h.status === "paused" ? "Paused" : "Archived"}
                </span>
              </div>
              {h.description && <p className="txt-s soft" style={{ maxWidth: 560 }}>{h.description}</p>}
              <div className="row-xs wrap mt-s">
                <span className="chip chip-static" style={{ background: CATEGORIES[h.category].soft, color: CATEGORIES[h.category].deep, borderColor: "transparent" }}>
                  <Icon name={CATEGORIES[h.category].icon} size={12} /> {CATEGORIES[h.category].label}
                </span>
                <span className="chip chip-static"><Icon name="calendar" size={12} /> {fmtSchedule(h.weekdays)}</span>
                {h.goal && <span className="chip chip-static"><Icon name="target" size={12} /> {h.goal.value} {h.goal.unit} / day</span>}
                {h.reminder && <span className="chip chip-static"><Icon name="bell" size={12} /> {h.reminder}</span>}
                <span className="chip chip-static"><Icon name="clock" size={12} /> since {fmtMedium(parseKey(h.startDate))}</span>
              </div>
            </div>
            <div className="row-s wrap">
              <button className="btn btn-ghost btn-s" onClick={() => onEdit(h.id)}>
                <Icon name="pencil" size={14} /> Edit
              </button>
              {h.status !== "archived" && (
                <button
                  className="btn btn-ghost btn-s"
                  onClick={() => {
                    updateHabit(h.id, { status: h.status === "paused" ? "active" : "paused" });
                    toast(h.status === "paused" ? "Resumed." : "Paused — history kept.", "info");
                  }}
                >
                  <Icon name={h.status === "paused" ? "play" : "pause"} size={14} />
                  {h.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
              {h.status !== "archived" && (
                <button className="btn btn-ghost btn-s" onClick={() => setConfirm("archive")}>
                  <Icon name="archive" size={14} /> Archive
                </button>
              )}
              <button className="btn btn-danger btn-s" onClick={() => setConfirm("delete")}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* stats tiles */}
      <div className="grid-4">
        {[
          { label: "Current streak", value: String(stats.current), suffix: stats.current === 1 ? "day" : "days", icon: "flame", color: "var(--gold)", soft: "var(--gold-soft)" },
          { label: "Longest streak", value: String(stats.longest), suffix: stats.longest === 1 ? "day" : "days", icon: "target", color: c.base, soft: c.soft },
          { label: "30-day completion", value: pct(stats.rate30), suffix: `${stats.scheduled30} scheduled`, icon: "chart", color: "var(--teal)", soft: "var(--teal-soft)" },
          { label: "Lifetime check-ins", value: String(stats.total), suffix: "completions", icon: "check", color: "var(--leaf)", soft: "var(--leaf-soft)" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={100 + i * 60}>
            <div className="card hrow pad">
              <div className="row-xs spread">
                <p className="tag">{s.label}</p>
                <span className="tile tile-s" style={{ background: s.soft, color: s.color }}>
                  <Icon name={s.icon} size={15} />
                </span>
              </div>
              <p className="num" style={{ fontSize: 30, marginTop: 10, lineHeight: 1 }}>{s.value}</p>
              <p className="txt-xs bold muted mt-s">{s.suffix}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="split-wide split">
        {/* heatmap */}
        <Reveal delay={150}>
          <section className="card pad-l" aria-label="History heatmap">
            <div className="row spread wrap mb-m">
              <p className="tag">Last 12 weeks</p>
              <div className="legend" style={{ border: "none", margin: 0, padding: 0 }}>
                <span><span className="legend-dot" style={{ background: c.base }} />Done</span>
                <span><span className="legend-dot" style={{ background: "var(--gold)" }} />Partial</span>
                <span><span className="legend-dot" style={{ background: "var(--coral-soft)", outline: "1px solid var(--coral)" }} />Missed</span>
              </div>
            </div>
            <div className="heat-scroll">
              <div className="heat">
                <div className="heat-labels">
                  {[0, 2, 4, 6].map((i) => (
                    <span key={i}>{WEEKDAYS_SHORT[(i + state.settings.weekStart) % 7]}</span>
                  ))}
                </div>
                {heat.map((col, ci) => (
                  <div key={ci} className="heat-col">
                    {col.map(({ date, st }, ri) => (
                      <div
                        key={ri}
                        className="heat-cell"
                        style={cellStyle(st)}
                        title={`${fmtShort(date)} — ${STATE_META[st]?.label ?? st}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* last 14 days */}
        <Reveal delay={210}>
          <section className="card pad-l" aria-label="Recent days">
            <p className="tag mb-s">Last 14 days</p>
            <div className="stack-xs" style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
              {[...days].reverse().map(({ date, st }) => {
                const meta = STATE_META[st];
                const log = habitLog(state.logs, h.id, dkey(date));
                const isT = dkey(date) === tk;
                return (
                  <div key={dkey(date)} className="row-s" style={{ borderRadius: 9, padding: "7px 10px", background: isT ? "var(--surface2)" : "transparent" }}>
                    <span className="bold txt-s" style={{ width: 78, flex: "none" }}>{relDay(date)}</span>
                    <span className="badge" style={{ background: meta.bg, color: meta.color, fontSize: 11 }}>
                      {st === "partial" && h.goal ? `${log?.value ?? 0}/${h.goal.value} ${h.goal.unit}` : meta.label}
                    </span>
                    {st === "done" && h.goal && (
                      <span className="txt-xs bold muted">{log?.value ?? h.goal.value} {h.goal.unit}</span>
                    )}
                    {isT && h.status === "active" && (
                      <button
                        className={`checkbtn checkbtn-sm ${st === "done" ? "on" : ""}`}
                        style={{ ["--cb" as never]: c.base, marginLeft: "auto" }}
                        aria-pressed={st === "done"}
                        aria-label={`Toggle today for ${h.name}`}
                        onClick={() => {
                          if (st === "done") setLog(h.id, tk, h.goal ? { value: 0 } : null);
                          else setLog(h.id, tk, { done: true, skipped: false, ...(h.goal ? { value: h.goal.value } : {}) });
                        }}
                      >
                        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>
      </div>

      <ConfirmModal
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title="Delete habit?"
        body={`“${h.name}” and its entire history will be permanently removed. This can't be undone.`}
        confirmLabel="Delete forever"
        onConfirm={() => {
          removeHabit(h.id);
          toast(`“${h.name}” deleted.`, "err");
          nav({ name: "habits" });
        }}
      />
      <ConfirmModal
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        title="Archive habit?"
        body={`“${h.name}” will be hidden from your dashboard but its history is kept. You can restore it from the Archived filter.`}
        confirmLabel="Archive"
        onConfirm={() => {
          updateHabit(h.id, { status: "archived" });
          toast(`“${h.name}” archived.`, "info");
          nav({ name: "habits" });
        }}
      />
    </div>
  );
}
