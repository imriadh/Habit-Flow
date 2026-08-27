import { useMemo, useState } from "react";
import type { CategoryId, Habit, NavFn } from "../types";
import { CATEGORIES, HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { ConfirmModal, EmptyState, Reveal, Segmented, useToast } from "../components/ui";
import { addDays, dkey, fmtSchedule, pct, today } from "../lib/dates";
import { currentStreak, dayState, habitLog, habitStats, isScheduled, rateForRange } from "../lib/stats";

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

  return (
    <div className="stack-l">
      <Reveal>
        <div className="row wrap spread">
          <div>
            <h2 className="h1">Your habits</h2>
            <p className="txt-s muted mt-s">
              {counts.active} active · {counts.paused} paused · {counts.archived} archived
            </p>
          </div>
          <button className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" size={16} sw={2.4} /> New habit
          </button>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="row-s wrap">
          <div className="search-wrap">
            <Icon name="search" size={16} />
            <input className="input" placeholder="Search habits…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search habits" />
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
          <div className="row-xs wrap">
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
        <div className="grid-2">
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
                onArchive={() => {
                  updateHabit(h.id, { status: "archived" });
                  toast(`“${h.name}” archived. Find it under Archived.`, "info");
                }}
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
    <article className="card hrow pad-l stack-s" style={{ cursor: "pointer", opacity: status !== "active" ? 0.78 : 1 }} onClick={onOpen}>
      <div className="row top">
        <span className="tile" style={{ background: c.soft, color: c.deep }}>
          <Icon name={h.icon} size={20} />
        </span>
        <div className="grow">
          <div className="row-xs">
            <h3 className="bold clip" style={{ fontSize: 15, lineHeight: 1.25 }}>{h.name}</h3>
            {st === "done" && dueToday && (
              <span style={{ display: "grid", placeItems: "center", width: 20, height: 20, flex: "none", borderRadius: "50%", background: "var(--leaf)", color: "#fff" }}>
                <Icon name="check" size={11} sw={2.8} />
              </span>
            )}
          </div>
          <p className="txt-xs muted clip mt-s">
            {h.description || `${CATEGORIES[h.category].label} · ${fmtSchedule(h.weekdays)}`}
          </p>
        </div>

        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn icon-btn-s" onClick={() => setMenu(menuOpen ? null : h.id)} aria-label={`Options for ${h.name}`}>
            <Icon name="dots" size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenu(null)} />
              <div className="menu-pop card">
                <button className="menu-item" onClick={() => { setMenu(null); onEdit(); }}>
                  <Icon name="pencil" size={15} /> Edit
                </button>
                <button className="menu-item" onClick={() => { setMenu(null); onPauseToggle(); }}>
                  <Icon name={h.status === "paused" ? "play" : "pause"} size={15} />
                  {h.status === "paused" ? "Resume" : "Pause"}
                </button>
                {h.status !== "archived" && (
                  <button className="menu-item" onClick={() => { setMenu(null); onArchive(); }}>
                    <Icon name="archive" size={15} /> Archive
                  </button>
                )}
                <button className="menu-item danger" onClick={() => { setMenu(null); onDelete(); }}>
                  <Icon name="trash" size={15} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="row-xs wrap">
        <span className="chip chip-static" style={{ background: CATEGORIES[h.category].soft, color: CATEGORIES[h.category].deep, borderColor: "transparent" }}>
          <Icon name={CATEGORIES[h.category].icon} size={12} />
          {CATEGORIES[h.category].label}
        </span>
        <span className="chip chip-static">
          <Icon name="calendar" size={12} />
          {fmtSchedule(h.weekdays)}
        </span>
        {h.goal && (
          <span className="chip chip-static">
            <Icon name="target" size={12} />
            {h.goal.value} {h.goal.unit}
          </span>
        )}
        {h.reminder && (
          <span className="chip chip-static">
            <Icon name="bell" size={12} />
            {h.reminder}
          </span>
        )}
      </div>

      <div className="row mt-s" style={{ gap: 12 }}>
        <div className="grow">
          <div className="row-xs spread">
            <span className="txt-xs bold muted">30-day completion</span>
            <span className="num txt-s" style={{ color: c.deep }}>{pct(r30.rate)}</span>
          </div>
          <div className="bar mt-s" style={{ height: 7 }}>
            <span className="bar-i" style={{ width: `${(r30.rate ?? 0) * 100}%`, background: c.base }} />
          </div>
        </div>
        <div className="row-xs" style={{ flex: "none", background: "var(--gold-soft)", color: "var(--gold-deep)", borderRadius: 9, padding: "5px 9px" }} title="Current streak">
          <Icon name="flame" size={14} sw={2} />
          <span className="num txt-s" style={{ lineHeight: 1 }}>{streak}</span>
        </div>
      </div>

      <div className="card-foot row spread" onClick={(e) => e.stopPropagation()}>
        <span className="txt-xs bold muted">{total} lifetime check-ins</span>
        {status === "active" && dueToday ? (
          <button
            className={`checkbtn checkbtn-sm ${st === "done" ? "on" : ""}`}
            style={{ ["--cb" as never]: c.base }}
            onClick={onToggleDone}
            aria-pressed={st === "done"}
            aria-label={`Mark ${h.name} done for today`}
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </button>
        ) : status === "paused" ? (
          <button className="btn btn-ghost btn-s" onClick={onPauseToggle}>
            <Icon name="play" size={13} /> Resume
          </button>
        ) : (
          <span className="txt-xs bold muted">{status === "archived" ? "Archived" : "Not scheduled today"}</span>
        )}
      </div>
    </article>
  );
}
