import { useMemo, useState } from "react";
import type { CategoryId, Habit, NavFn } from "../types";
import { CATEGORIES, HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { ConfirmModal, EmptyState, Reveal, Segmented, useToast } from "../components/ui";
import { dkey, fmtSchedule, pct, today } from "../lib/dates";
import { currentStreak, dayState, habitLog, habitStats, isScheduled, rateForRange } from "../lib/stats";
import { addDays, logKey } from "../lib/dates";

type StatusFilter = "active" | "paused" | "archived";

export function Habits({
  nav,
  onAdd,
  onEdit,
}: {
  nav: NavFn;
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  const { state, updateHabit, removeHabit, setLog } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [menu, setMenu] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Habit | null>(null);

  const tk = dkey(today());

  const filtered = useMemo(() => {
    return state.habits
      .filter((h) => h.status === status)
      .filter((h) => (cat === "all" ? true : h.category === cat))
      .filter((h) => h.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [state.habits, q, cat, status]);

  const counts = useMemo(
    () => ({
      active: state.habits.filter((h) => h.status === "active").length,
      paused: state.habits.filter((h) => h.status === "paused").length,
      archived: state.habits.filter((h) => h.status === "archived").length,
    }),
    [state.habits]
  );

  const quickDone = (h: Habit) => {
    const st = dayState(h, today(), habitLog(state.logs, h.id, tk));
    if (st === "done") {
      setLog(h.id, tk, h.goal ? { value: 0 } : null);
      return;
    }
    setLog(h.id, tk, { done: true, skipped: false, ...(h.goal ? { value: h.goal.value } : {}) });
    toast(`${h.name} done for today.`, "ok");
  };

  const archive = (h: Habit) => {
    updateHabit(h.id, { status: "archived" });
    toast(`“${h.name}” archived. Find it under Archived.`, "info");
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">Your habits</h2>
            <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">
              {counts.active} active · {counts.paused} paused · {counts.archived} archived
            </p>
          </div>
          <button className="btn btn-primary ml-auto" onClick={onAdd}>
            <Icon name="plus" size={16} sw={2.4} /> New habit
          </button>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
            <input
              className="input !pl-9"
              placeholder="Search habits…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search habits"
            />
          </div>
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { v: "active", label: "Active" },
              { v: "paused", label: "Paused" },
              { v: "archived", label: "Archived" },
            ]}
          />
          <div className="flex flex-wrap gap-1.5">
            <button className={`chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>
              All
            </button>
            {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
              <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
                <Icon name={CATEGORIES[c].icon} size={13} />
                {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal delay={100}>
          {state.habits.length === 0 ? (
            <EmptyState icon="leaf" title="No habits yet" sub="Your garden is empty. Plant the first habit — tiny is fine.">
              <button className="btn btn-primary" onClick={onAdd}>
                <Icon name="plus" size={16} sw={2.4} /> Create a habit
              </button>
            </EmptyState>
          ) : (
            <EmptyState icon="search" title="Nothing matches" sub="No habits match the current search or filters." />
          )}
        </Reveal>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((h, i) => (
            <Reveal key={h.id} delay={Math.min(i * 60, 300)}>
              <HabitCard
                h={h}
                status={status}
                menuOpen={menu === h.id}
                setMenu={setMenu}
                onOpen={() => nav({ name: "habit", id: h.id })}
                onEdit={() => onEdit(h.id)}
                onToggleDone={() => quickDone(h)}
                onPauseToggle={() => {
                  updateHabit(h.id, { status: h.status === "paused" ? "active" : "paused" });
                  toast(h.status === "paused" ? `“${h.name}” resumed.` : `“${h.name}” paused — history kept.`, "info");
                }}
                onArchive={() => archive(h)}
                onDelete={() => setToDelete(h)}
              />
            </Reveal>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete habit?"
        body={`“${toDelete?.name}” and its entire history will be permanently removed. This can't be undone.`}
        confirmLabel="Delete forever"
        onConfirm={() => {
          if (toDelete) {
            removeHabit(toDelete.id);
            toast(`“${toDelete.name}” deleted.`, "err");
          }
        }}
      />
    </div>
  );
}

function HabitCard({
  h,
  status,
  menuOpen,
  setMenu,
  onOpen,
  onEdit,
  onToggleDone,
  onPauseToggle,
  onArchive,
  onDelete,
}: {
  h: Habit;
  status: StatusFilter;
  menuOpen: boolean;
  setMenu: (id: string | null) => void;
  onOpen: () => void;
  onEdit: () => void;
  onToggleDone: () => void;
  onPauseToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { state } = useStore();
  const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
  const r30 = useMemo(() => rateForRange(h, state.logs, addDays(today(), -29), today()), [h, state.logs]);
  const streak = useMemo(() => currentStreak(h, state.logs), [h, state.logs]);
  const dueToday = h.status === "active" && isScheduled(h, today());
  const st = dayState(h, today(), habitLog(state.logs, h.id, dkey(today())));
  const total = useMemo(() => habitStats(state, h).total, [state, h]);

  return (
    <article
      className={`card hrow relative flex cursor-pointer flex-col p-5 ${status !== "active" ? "opacity-75" : ""}`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <span className="tile" style={{ background: c.soft, color: c.deep }}>
          <Icon name={h.icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold leading-tight">{h.name}</h3>
            {st === "done" && dueToday && (
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--leaf)] text-white">
                <Icon name="check" size={11} sw={2.8} />
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--mut)]">
            {h.description || `${CATEGORIES[h.category].label} · ${fmtSchedule(h.weekdays)}`}
          </p>
        </div>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn !h-8 !w-8 !rounded-lg" onClick={() => setMenu(menuOpen ? null : h.id)} aria-label={`Options for ${h.name}`}>
            <Icon name="dots" size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
              <div className="menu-pop card absolute right-0 top-10 z-20 w-44 p-1.5">
                <MenuItem icon="pencil" label="Edit" onClick={() => { setMenu(null); onEdit(); }} />
                <MenuItem icon={h.status === "paused" ? "play" : "pause"} label={h.status === "paused" ? "Resume" : "Pause"} onClick={() => { setMenu(null); onPauseToggle(); }} />
                {h.status !== "archived" && <MenuItem icon="archive" label="Archive" onClick={() => { setMenu(null); onArchive(); }} />}
                <MenuItem icon="trash" label="Delete" danger onClick={() => { setMenu(null); onDelete(); }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="chip !cursor-default" style={{ background: CATEGORIES[h.category].soft, color: CATEGORIES[h.category].deep, borderColor: "transparent" }}>
          <Icon name={CATEGORIES[h.category].icon} size={12} />
          {CATEGORIES[h.category].label}
        </span>
        <span className="chip !cursor-default">
          <Icon name="calendar" size={12} />
          {fmtSchedule(h.weekdays)}
        </span>
        {h.goal && (
          <span className="chip !cursor-default">
            <Icon name="target" size={12} />
            {h.goal.value} {h.goal.unit}
          </span>
        )}
        {h.reminder && (
          <span className="chip !cursor-default">
            <Icon name="bell" size={12} />
            {h.reminder}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold text-[var(--mut)]">30-day completion</span>
            <span className="num text-sm" style={{ color: c.deep }}>{pct(r30.rate)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(r30.rate ?? 0) * 100}%`, background: c.base }}
            />
          </div>
        </div>
        <div className="flex flex-none items-center gap-1 rounded-lg bg-[var(--gold-soft)] px-2 py-1 text-[var(--gold-deep)]" title="Current streak">
          <Icon name="flame" size={14} sw={2} />
          <span className="num text-sm leading-none">{streak}</span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-[var(--line)] pt-3.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-semibold text-[var(--mut)]">{total} lifetime check-ins</span>
        {status === "active" && dueToday ? (
          <button
            className={`checkbtn !h-9 !w-9 !rounded-xl ${st === "done" ? "on" : ""}`}
            style={{ ["--cb" as never]: c.base }}
            onClick={onToggleDone}
            aria-pressed={st === "done"}
            aria-label={`Mark ${h.name} done for today`}
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <span key={a} className="b" style={{ ["--a" as never]: `${a}deg` }} />
            ))}
          </button>
        ) : status === "paused" ? (
          <button className="btn btn-ghost !px-3 !py-1.5 !text-[12px]" onClick={onPauseToggle}>
            <Icon name="play" size={13} /> Resume
          </button>
        ) : (
          <span className="text-[11px] font-bold text-[var(--mut)]">
            {status === "archived" ? "Archived" : "Not scheduled today"}
          </span>
        )}
      </div>
    </article>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
        danger ? "text-[var(--coral-deep)] hover:bg-[var(--coral-soft)]" : "text-[var(--ink2)] hover:bg-[var(--surface2)]"
      }`}
      onClick={onClick}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
