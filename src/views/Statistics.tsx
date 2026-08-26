import { useMemo } from "react";
import { HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Bars, Reveal } from "../components/ui";
import { parseKey, pct, today, WEEKDAYS_LONG } from "../lib/dates";
import {
  habitStats,
  overallLongestStreak,
  perfectDays,
  rateForRange,
  totalCompletions,
  weeklySeries,
  weekdayRates,
} from "../lib/stats";

export function Statistics() {
  const { state } = useStore();

  const series = useMemo(() => weeklySeries(state, 10, state.settings.weekStart), [state]);
  const weekdays = useMemo(() => weekdayRates(state), [state]);
  const bestOverall = useMemo(() => overallLongestStreak(state), [state]);
  const perfect = useMemo(() => perfectDays(state), [state]);
  const total = useMemo(() => totalCompletions(state), [state]);

  const allTime = useMemo(() => {
    let done = 0;
    let scheduled = 0;
    for (const h of state.habits) {
      if (h.status === "archived") continue;
      const r = rateForRange(h, state.logs, parseKey(h.startDate), today());
      done += r.done;
      scheduled += r.scheduled;
    }
    return scheduled ? done / scheduled : null;
  }, [state]);

  const rows = useMemo(() => {
    return state.habits
      .filter((h) => h.status === "active")
      .map((h) => ({ h, s: habitStats(state, h) }))
      .sort((a, b) => (b.s.rate30 ?? -1) - (a.s.rate30 ?? -1));
  }, [state]);

  const wdSorted = weekdays
    .map((w, i) => ({ ...w, i }))
    .filter((w) => w.scheduled > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const bestDow = wdSorted[0]?.i;
  const worstDow = wdSorted.length > 1 ? wdSorted[wdSorted.length - 1].i : undefined;

  const topHabit = rows.find((r) => r.s.scheduled30 >= 3);
  const bottomHabit = rows.length > 1 ? [...rows].reverse().find((r) => r.s.scheduled30 >= 3) : undefined;

  const tiles = [
    { label: "All-time completion", value: pct(allTime), icon: "chart", color: "var(--leaf)", soft: "var(--leaf-soft)" },
    { label: "Perfect days", value: String(perfect), icon: "spark", color: "var(--gold)", soft: "var(--gold-soft)" },
    { label: "Best overall streak", value: `${bestOverall}d`, icon: "flame", color: "var(--coral)", soft: "var(--coral-soft)" },
    { label: "Lifetime check-ins", value: String(total), icon: "check", color: "var(--teal)", soft: "var(--teal-soft)" },
  ];

  return (
    <div className="space-y-5">
      <Reveal>
        <div>
          <h2 className="disp text-2xl font-extrabold tracking-tight sm:text-3xl">Statistics</h2>
          <p className="mt-0.5 text-sm font-medium text-[var(--mut)]">
            Your behavior, measured honestly — completions, streaks and weak spots.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 60}>
            <div className="card hrow p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">{t.label}</p>
                <span className="tile !h-8 !w-8 !rounded-lg" style={{ background: t.soft, color: t.color }}>
                  <Icon name={t.icon} size={15} />
                </span>
              </div>
              <p className="num mt-2 text-3xl leading-none">{t.value}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={100}>
          <section className="card p-5" aria-label="Weekly trend">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="tag">Weekly completion</p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--mut)]">Last 10 weeks, all habits</p>
              </div>
              <span className="rounded-full bg-[var(--leaf-soft)] px-2.5 py-1 text-xs font-bold text-[var(--leaf-deep)]">
                {pct(series[series.length - 1]?.rate ?? null)} now
              </span>
            </div>
            <Bars
              height={140}
              data={series.map((s) => ({ label: s.label.split(" ")[0], value: s.rate, highlight: s.current }))}
            />
          </section>
        </Reveal>

        <Reveal delay={160}>
          <section className="card p-5" aria-label="Day of week performance">
            <p className="tag">Best & weakest days</p>
            <p className="mt-1 mb-4 text-[13px] font-semibold text-[var(--mut)]">Completion by weekday, last 90 days</p>
            <div className="space-y-2.5">
              {weekdays.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-10 flex-none text-xs font-bold ${i === bestDow ? "text-[var(--leaf-deep)]" : i === worstDow ? "text-[var(--coral-deep)]" : "text-[var(--mut)]"}`}>
                    {WEEKDAYS_LONG[i].slice(0, 3)}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(w.rate ?? 0) * 100}%`,
                        background: i === bestDow ? "var(--leaf)" : i === worstDow ? "var(--coral)" : "var(--pine)",
                        opacity: w.rate === null ? 0 : 0.85,
                      }}
                    />
                  </div>
                  <span className="num w-11 flex-none text-right text-sm">{pct(w.rate)}</span>
                  {i === bestDow && <span className="hidden w-12 text-[10px] font-bold text-[var(--leaf-deep)] sm:block">BEST</span>}
                  {i === worstDow && <span className="hidden w-12 text-[10px] font-bold text-[var(--coral-deep)] sm:block">WEAK</span>}
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <Reveal delay={220}>
        <section className="card p-5" aria-label="Habit comparison">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="tag">Habit comparison</p>
              <p className="mt-1 text-[13px] font-semibold text-[var(--mut)]">30-day completion, ranked</p>
            </div>
          </div>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-[var(--mut)]">No active habits to compare yet.</p>}
          <ul className="space-y-3">
            {rows.map(({ h, s }) => {
              const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
              const isTop = topHabit && h.id === topHabit.h.id;
              const isBottom = bottomHabit && h.id === bottomHabit.h.id && !isTop;
              return (
                <li key={h.id} className="flex items-center gap-3.5">
                  <span className="tile !h-10 !w-10 !rounded-xl" style={{ background: c.soft, color: c.deep }}>
                    <Icon name={h.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-bold leading-tight">{h.name}</p>
                      {isTop && (
                        <span className="rounded-full bg-[var(--leaf-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--leaf-deep)]">MOST CONSISTENT</span>
                      )}
                      {isBottom && (
                        <span className="rounded-full bg-[var(--coral-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--coral-deep)]">NEEDS ATTENTION</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(s.rate30 ?? 0) * 100}%`, background: c.base }}
                        />
                      </div>
                      <span className="num w-11 flex-none text-right text-sm" style={{ color: c.deep }}>{pct(s.rate30)}</span>
                    </div>
                  </div>
                  <div className="hidden flex-none items-center gap-1 rounded-lg bg-[var(--gold-soft)] px-2 py-1 text-[var(--gold-deep)] sm:flex" title="Current streak">
                    <Icon name="flame" size={13} sw={2} />
                    <span className="num text-sm leading-none">{s.current}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
