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
    <div className="space-y-5">
      <Reveal>
        <button className="flex items-center gap-2 text-sm font-bold text-[var(--mut)] transition-colors hover:text-[var(--ink)]" onClick={() => nav({ name: "habits" })}>
          <Icon name="arrowL" size={16} /> All habits
        </button>
      </Reveal>

      {/* header */}
      <Reveal delay={50}>
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="tile !h-14 !w-14 !rounded-2xl" style={{ background: c.soft, color: c.deep }}>
              <Icon name={h.icon} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">{h.name}</h2>
                <span className="chip !cursor-default" style={{ background: h.status === "active" ? "var(--leaf-soft)" : "var(--gold-soft)", color: h.status === "active" ? "var(--leaf-deep)" : "var(--gold-deep)", borderColor: "transparent" }}>
                  {h.status === "active" ? "Active" : h.status === "paused" ? "Paused" : "Archived"}
                </span>
              </div>
              {h.description && <p className="mt-1 max-w-xl text-sm text-[var(--ink2)]">{h.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip !cursor-default" style={{ background: CATEGORIES[h.category].soft, color: CATEGORIES[h.category].deep, borderColor: "transparent" }}>
                  <Icon name={CATEGORIES[h.category].icon} size={12} /> {CATEGORIES[h.category].label}
                </span>
                <span className="chip !cursor-default"><Icon name="calendar" size={12} /> {fmtSchedule(h.weekdays)}</span>
                {h.goal && <span className="chip !cursor-default"><Icon name="target" size={12} /> {h.goal.value} {h.goal.unit} / day</span>}
                {h.reminder && <span className="chip !cursor-default"><Icon name="bell" size={12} /> {h.reminder}</span>}
                <span className="chip !cursor-default"><Icon name="clock" size={12} /> since {fmtMedium(parseKey(h.startDate))}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost !px-3.5 !text-[13px]" onClick={() => onEdit(h.id)}>
                <Icon name="pencil" size={14} /> Edit
              </button>
              {h.status !== "archived" && (
                <button className="btn btn-ghost !px-3.5 !text-[13px]" onClick={() => { updateHabit(h.id, { status: h.status === "paused" ? "active" : "paused" }); toast(h.status === "paused" ? "Resumed." : "Paused — history kept.", "info"); }}>
                  <Icon name={h.status === "paused" ? "play" : "pause"} size={14} />
                  {h.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
              {h.status !== "archived" && (
                <button className="btn btn-ghost !px-3.5 !text-[13px]" onClick={() => setConfirm("archive")}>
                  <Icon name="archive" size={14} /> Archive
                </button>
              )}
              <button className="btn btn-danger !px-3.5 !text-[13px]" onClick={() => setConfirm("delete")}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* stats tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Current streak", value: String(stats.current), suffix: stats.current === 1 ? "day" : "days", icon: "flame", color: "var(--gold)", soft: "var(--gold-soft)" },
          { label: "Longest streak", value: String(stats.longest), suffix: stats.longest === 1 ? "day" : "days", icon: "target", color: c.base, soft: c.soft },
          { label: "30-day completion", value: pct(stats.rate30), suffix: `${stats.scheduled30} scheduled`, icon: "chart", color: "var(--teal)", soft: "var(--teal-soft)" },
          { label: "Lifetime check-ins", value: String(stats.total), suffix: "completions", icon: "check", color: "var(--leaf)", soft: "var(--leaf-soft)" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={100 + i * 60}>
            <div className="card hrow p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">{s.label}</p>
                <span className="tile !h-8 !w-8 !rounded-lg" style={{ background: s.soft, color: s.color }}>
                  <Icon name={s.icon} size={15} />
                </span>
              </div>
              <p className="num mt-2 text-3xl leading-none">{s.value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--mut)]">{s.suffix}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* heatmap */}
        <Reveal delay={150}>
          <section className="card p-5" aria-label="History heatmap">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="tag">Last 12 weeks</p>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--mut)]">
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-[4px]" style={{ background: c.base }} /> Done</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-[4px] bg-[var(--gold)]" /> Partial</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-[4px] bg-[var(--coral-soft)] outline outline-1 -outline-offset-1 outline-[var(--coral)]" /> Missed</span>
              </div>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-[420px] gap-1.5">
                <div className="mr-1 flex flex-col justify-between py-0.5 text-[9px] font-bold text-[var(--mut)]">
                  {[0, 2, 4, 6].map((i) => (
                    <span key={i} className="h-[13px] leading-[13px]">{WEEKDAYS_SHORT[(i + state.settings.weekStart) % 7]}</span>
                  ))}
                </div>
                {heat.map((col, ci) => (
                  <div key={ci} className="flex flex-1 flex-col gap-1.5">
                    {col.map(({ date, st }, ri) => (
                      <div
                        key={ri}
                        className="w-full rounded-[4px] transition-transform hover:scale-125"
                        style={{ height: 13, ...cellStyle(st) }}
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
          <section className="card p-5" aria-label="Recent days">
            <p className="tag mb-3">Last 14 days</p>
            <ul className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
              {[...days].reverse().map(({ date, state: st }) => {
                const meta = STATE_META[st];
                const log = habitLog(state.logs, h.id, dkey(date));
                const isT = dkey(date) === tk;
                return (
                  <li key={dkey(date)} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${isT ? "bg-[var(--surface2)]" : ""}`}>
                    <span className="w-20 flex-none text-[13px] font-bold">{relDay(date)}</span>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                      {st === "partial" && h.goal ? `${log?.value ?? 0}/${h.goal.value} ${h.goal.unit}` : meta.label}
                    </span>
                    {st === "done" && h.goal && <span className="text-[11px] font-semibold text-[var(--mut)]">{log?.value ?? h.goal.value} {h.goal.unit}</span>}
                    {isT && h.status === "active" && (
                      <button
                        className={`checkbtn !h-8 !w-8 !rounded-lg ml-auto ${st === "done" ? "on" : ""}`}
                        style={{ ["--cb" as never]: c.base }}
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
                  </li>
                );
              })}
            </ul>
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
