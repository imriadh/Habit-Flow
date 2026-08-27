import { useMemo } from "react";
import { HABIT_COLORS } from "../types";
import { useStore } from "../store";
import { Icon } from "../components/icons";
import { Bars, Reveal, Ring } from "../components/ui";
import { pct, today, WEEKDAYS_LONG } from "../lib/dates";
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
  const t = today();

  const all30 = useMemo(() => {
    let done = 0, scheduled = 0;
    for (const h of state.habits.filter((x) => x.status !== "archived")) {
      const r = rateForRange(h, state.logs, new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29), t);
      done += r.done;
      scheduled += r.scheduled;
    }
    return scheduled ? done / scheduled : null;
  }, [state]);

  const perfect30 = useMemo(() => perfectDays(state, 30), [state]);
  const longest = useMemo(() => overallLongestStreak(state), [state]);
  const completions = useMemo(() => totalCompletions(state), [state]);
  const week = useMemo(() => weeklySeries(state, 10, state.settings.weekStart), [state]);
  const wd = useMemo(() => weekdayRates(state, 90), [state]);
  const wdSorted = [...wd].filter((x) => x.rate !== null).sort((a, b) => b.rate! - a.rate!);
  const bestWd = wdSorted[0] ?? null;
  const worstWd = wdSorted.length > 1 ? wdSorted[wdSorted.length - 1] : null;

  const per = useMemo(
    () =>
      state.habits
        .filter((h) => h.status !== "archived")
        .map((h) => ({ h, s: habitStats(state, h) }))
        .sort((a, b) => (b.s.rate30 ?? -1) - (a.s.rate30 ?? -1)),
    [state]
  );
  const mostConsistent = per[0] ?? null;
  const needsWork = per.length > 1 ? per[per.length - 1] : null;

  return (
    <div className="stack-l">
      <Reveal>
        <div>
          <h2 className="h1">Statistics</h2>
          <p className="txt-s muted mt-s">What your last 30 days of tracking actually say about you.</p>
        </div>
      </Reveal>

      {/* headline stats */}
      <div className="grid-4">
        <Reveal delay={40}>
          <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Ring value={all30 ?? 0} size={84} stroke={9} color="var(--leaf)">
              <span className="num" style={{ fontSize: 18 }}>{pct(all30)}</span>
            </Ring>
            <div>
              <p className="tag">30-day rate</p>
              <p className="txt-xs bold muted mt-s">across all habits</p>
            </div>
          </div>
        </Reveal>
        {[
          { label: "Perfect days", value: String(perfect30), sub: "of last 30", icon: "check", color: "var(--teal)", soft: "var(--teal-soft)" },
          { label: "Best streak", value: `${longest}d`, sub: "all habits, all time", icon: "flame", color: "var(--gold)", soft: "var(--gold-soft)" },
          { label: "Check-ins", value: String(completions), sub: "lifetime completions", icon: "target", color: "var(--leaf)", soft: "var(--leaf-soft)" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={90 + i * 50}>
            <div className="card pad hrow" style={{ height: "100%" }}>
              <div className="row-xs spread">
                <p className="tag">{s.label}</p>
                <span className="tile tile-s" style={{ background: s.soft, color: s.color }}>
                  <Icon name={s.icon} size={15} />
                </span>
              </div>
              <p className="num" style={{ fontSize: 30, marginTop: 10, lineHeight: 1 }}>{s.value}</p>
              <p className="txt-xs bold muted mt-s">{s.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="split">
        {/* weekly trend */}
        <Reveal delay={120}>
          <section className="card pad-l" aria-label="Weekly trend">
            <p className="tag mb-m">Completion — last 10 weeks</p>
            <Bars data={week} height={140} />
          </section>
        </Reveal>

        {/* weekday analysis */}
        <Reveal delay={170}>
          <section className="card pad-l" aria-label="Weekday analysis">
            <p className="tag mb-m">Best & weakest days</p>
            {bestWd ? (
              <div className="stack">
                <div className="row-s">
                  <span className="tile tile-s" style={{ background: "var(--leaf-soft)", color: "var(--leaf-deep)" }}>
                    <Icon name="check" size={15} />
                  </span>
                  <div className="grow">
                    <p className="bold txt-s">{WEEKDAYS_LONG[bestWd.dow]}s are your power days</p>
                    <div className="bar mt-s" style={{ height: 7 }}>
                      <span className="bar-i" style={{ width: `${(bestWd.rate ?? 0) * 100}%`, background: "var(--leaf)" }} />
                    </div>
                  </div>
                  <span className="num" style={{ color: "var(--leaf-deep)" }}>{pct(bestWd.rate)}</span>
                </div>
                {worstWd && (
                  <div className="row-s">
                    <span className="tile tile-s" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}>
                      <Icon name="alert" size={15} />
                    </span>
                    <div className="grow">
                      <p className="bold txt-s">{WEEKDAYS_LONG[worstWd.dow]}s need a plan</p>
                      <div className="bar mt-s" style={{ height: 7 }}>
                        <span className="bar-i" style={{ width: `${(worstWd.rate ?? 0) * 100}%`, background: "var(--coral)" }} />
                      </div>
                    </div>
                    <span className="num" style={{ color: "var(--coral-deep)" }}>{pct(worstWd.rate)}</span>
                  </div>
                )}
                <p className="txt-xs muted">90-day average completion by weekday.</p>
              </div>
            ) : (
              <p className="txt-s muted">Not enough data yet — keep tracking.</p>
            )}
          </section>
        </Reveal>
      </div>

      {/* habit comparison */}
      <Reveal delay={200}>
        <section className="card pad-l" aria-label="Habit comparison">
          <div className="row spread mb-m">
            <p className="tag">Habit comparison — 30 days</p>
            {mostConsistent && (
              <span className="badge" style={{ background: "var(--leaf-soft)", color: "var(--leaf-deep)" }}>
                <Icon name="check" size={12} sw={2.4} /> Most consistent: {mostConsistent.h.name}
              </span>
            )}
          </div>
          {per.length === 0 && <p className="txt-s muted">Create habits to see them compared here.</p>}
          <div className="stack">
            {per.map(({ h, s }, idx) => {
              const c = HABIT_COLORS[h.color] ?? HABIT_COLORS.leaf;
              const flag = mostConsistent?.h.id === h.id ? "star" : needsWork?.h.id === h.id && per.length > 1 ? "warn" : null;
              return (
                <div key={h.id} className="row-s">
                  <span className="tile tile-s" style={{ background: c.soft, color: c.deep }}>
                    <Icon name={h.icon} size={15} />
                  </span>
                  <span className="bold txt-s" style={{ width: 130, flex: "none" }}>{h.name}</span>
                  <div className="bar grow" style={{ height: 8 }}>
                    <span className="bar-i" style={{ width: `${(s.rate30 ?? 0) * 100}%`, background: flag === "warn" ? "var(--coral)" : c.base, transitionDelay: `${idx * 60}ms` }} />
                  </div>
                  <span className="num txt-s" style={{ width: 44, textAlign: "right", color: c.deep }}>{pct(s.rate30)}</span>
                  {flag === "star" && (
                    <span className="badge" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)", flex: "none" }}>
                      <Icon name="spark" size={11} /> top
                    </span>
                  )}
                  {flag === "warn" && (
                    <span className="badge" style={{ background: "var(--coral-soft)", color: "var(--coral-deep)", flex: "none" }}>
                      focus here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>
    </div>
  );
}


