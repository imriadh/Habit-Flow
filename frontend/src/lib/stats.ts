import type { AppState, DayState, Habit, Logs } from "../types";
import {
  addDays,
  dkey,
  isToday,
  logKey,
  parseKey,
  pct,
  startOfWeek,
  today,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  fmtShort,
} from "./dates";

/* ------------------------------ day states ------------------------------ */

export const isScheduled = (h: Habit, d: Date) => {
  if (!h.weekdays.includes(d.getDay())) return false;
  return dkey(d) >= h.startDate;
};

export function dayState(h: Habit, d: Date, log?: { done: boolean; value?: number; skipped?: boolean }): DayState {
  const t = today();
  const dk = dkey(d);
  if (dk > dkey(t)) return "future";
  if (!isScheduled(h, d)) return "unscheduled";
  if (log?.skipped) return "skipped";
  if (h.goal) {
    const v = log?.value ?? 0;
    if (v >= h.goal.value) return "done";
    if (v > 0) return "partial";
    return isToday(d) ? "pending" : "missed";
  }
  if (log?.done) return "done";
  return isToday(d) ? "pending" : "missed";
}

export const habitLog = (logs: Logs, habitId: string, k: string) => logs[logKey(habitId, k)];

/** true = every scheduled habit done/skipped; null = nothing scheduled */
export function dayWin(s: AppState, d: Date): boolean | null {
  const k = dkey(d);
  const due = s.habits.filter((h) => h.status === "active" && isScheduled(h, d));
  if (due.length === 0) return null;
  return due.every((h) => {
    const st = dayState(h, d, s.logs[logKey(h.id, k)]);
    return st === "done" || st === "skipped";
  });
}

/* -------------------------------- streaks ------------------------------- */

export function currentStreak(h: Habit, logs: Logs): number {
  let streak = 0;
  let d = today();
  // today is still in progress: only "done" counts, anything else is neutral
  const st0 = dayState(h, d, habitLog(logs, h.id, dkey(d)));
  if (st0 === "done") streak++;
  d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    const st = dayState(h, d, habitLog(logs, h.id, dkey(d)));
    if (st === "done") streak++;
    else if (st === "unscheduled" || st === "skipped") {
      d = addDays(d, -1);
      continue;
    } else break;
    d = addDays(d, -1);
  }
  return streak;
}

export function longestStreak(h: Habit, logs: Logs): number {
  let best = 0;
  let run = 0;
  let d = parseKey(h.startDate);
  const t = today();
  while (d <= t) {
    const st = dayState(h, d, habitLog(logs, h.id, dkey(d)));
    if (st === "done") {
      run++;
      best = Math.max(best, run);
    } else if (st === "unscheduled" || st === "skipped" || st === "pending") {
      // neutral — keep the run
    } else run = 0;
    d = addDays(d, 1);
  }
  return best;
}

export function overallCurrentStreak(s: AppState): number {
  let streak = 0;
  let d = today();
  const w0 = dayWin(s, d);
  if (w0 === true) streak++;
  d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    const w = dayWin(s, d);
    if (w === true) streak++;
    else if (w === false) break;
    d = addDays(d, -1);
  }
  return streak;
}

export function overallLongestStreak(s: AppState): number {
  const starts = s.habits.filter((h) => h.status !== "archived").map((h) => parseKey(h.startDate));
  if (!starts.length) return 0;
  let d = starts.reduce((a, b) => (a < b ? a : b));
  const t = today();
  let best = 0;
  let run = 0;
  while (d <= t) {
    const w = dayWin(s, d);
    if (w === true) {
      run++;
      best = Math.max(best, run);
    } else if (w === false) run = 0;
    d = addDays(d, 1);
  }
  return best;
}

/* ------------------------------- aggregates ------------------------------ */

export function perfectDays(s: AppState, n: number): number {
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (dayWin(s, addDays(today(), -i)) === true) count++;
  }
  return count;
}

export function totalCompletions(s: AppState): number {
  return Object.values(s.logs).filter((l) => l.done).length;
}

export function rateForRange(h: Habit, logs: Logs, a: Date, b: Date) {
  let done = 0;
  let scheduled = 0;
  let d = new Date(a);
  while (d <= b) {
    if (isScheduled(h, d)) {
      const st = dayState(h, d, habitLog(logs, h.id, dkey(d)));
      if (st === "skipped") {
        d = addDays(d, 1);
        continue;
      }
      scheduled++;
      if (st === "done") done++;
    }
    d = addDays(d, 1);
  }
  return { done, scheduled, rate: scheduled ? done / scheduled : null };
}

export function weekdayRates(s: AppState, days = 90) {
  const acc: { done: number; scheduled: number }[] = Array.from({ length: 7 }, () => ({ done: 0, scheduled: 0 }));
  const habits = s.habits.filter((h) => h.status !== "archived");
  for (let i = 0; i < days; i++) {
    const d = addDays(today(), -i);
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      const st = dayState(h, d, habitLog(s.logs, h.id, dkey(d)));
      if (st === "skipped") continue;
      acc[d.getDay()].scheduled++;
      if (st === "done") acc[d.getDay()].done++;
    }
  }
  return acc.map((a, i) => ({ dow: i, ...a, rate: a.scheduled ? a.done / a.scheduled : null }));
}

export function weeklySeries(s: AppState, n: number, weekStart: 0 | 1) {
  const t = today();
  const out: { label: string; value: number | null; highlight?: boolean }[] = [];
  for (let w = n - 1; w >= 0; w--) {
    const a = addDays(startOfWeek(t, weekStart), -7 * w);
    const b = addDays(a, 6);
    const clampB = b > t ? t : b;
    let done = 0;
    let scheduled = 0;
    for (const h of s.habits.filter((x) => x.status !== "archived")) {
      let d = new Date(a);
      while (d <= clampB) {
        if (isScheduled(h, d)) {
          const st = dayState(h, d, habitLog(s.logs, h.id, dkey(d)));
          if (st !== "skipped") {
            scheduled++;
            if (st === "done") done++;
          }
        }
        d = addDays(d, 1);
      }
    }
    out.push({
      label: w === 0 ? "This wk" : fmtShort(a),
      value: scheduled ? done / scheduled : null,
      highlight: w === 0,
    });
  }
  return out;
}

export function lastNDays(s: AppState, h: Habit, n: number) {
  const out: { date: Date; st: DayState }[] = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(today(), -i);
    out.push({ date: d, st: dayState(h, d, habitLog(s.logs, h.id, dkey(d))) });
  }
  return out;
}

export interface HabitStats {
  rate30: number | null;
  scheduled30: number;
  current: number;
  longest: number;
  total: number;
}

export function habitStats(s: AppState, h: Habit): HabitStats {
  let total = 0;
  for (const k in s.logs) {
    if (k.startsWith(h.id + "|") && s.logs[k].done) total++;
  }
  const r30 = rateForRange(h, s.logs, addDays(today(), -29), today());
  return {
    rate30: r30.rate,
    scheduled30: r30.scheduled,
    current: currentStreak(h, s.logs),
    longest: longestStreak(h, s.logs),
    total,
  };
}

/* ------------------------------ weekly review ---------------------------- */

export interface WeeklyReview {
  rate: number | null;
  scheduled: number;
  done: number;
  delta: number | null;
  strongest: { name: string; rate: number } | null;
  weakest: { name: string; rate: number } | null;
  bestDay: number | null;
  worstDay: number | null;
}

export function weeklyReview(s: AppState): WeeklyReview {
  const t = today();
  const lastWeekStart = addDays(startOfWeek(t, s.settings.weekStart), -7);
  const habits = s.habits.filter((h) => h.status === "active");

  const range = (a: Date, b: Date) => {
    let done = 0;
    let scheduled = 0;
    for (const h of habits) {
      let d = new Date(a);
      while (d <= b) {
        if (isScheduled(h, d)) {
          const st = dayState(h, d, habitLog(s.logs, h.id, dkey(d)));
          if (st !== "skipped") {
            scheduled++;
            if (st === "done") done++;
          }
        }
        d = addDays(d, 1);
      }
    }
    return { done, scheduled, rate: scheduled ? done / scheduled : null };
  };

  const prev = range(lastWeekStart, addDays(lastWeekStart, 6));
  const cur = range(lastWeekStart, t < addDays(lastWeekStart, 6) ? t : addDays(lastWeekStart, 6));

  let strongest: WeeklyReview["strongest"] = null;
  let weakest: WeeklyReview["weakest"] = null;
  for (const h of habits) {
    const r = rateForRange(h, s.logs, addDays(t, -6), t);
    if (r.rate === null || r.scheduled < 2) continue;
    if (!strongest || r.rate > strongest.rate) strongest = { name: h.name, rate: r.rate };
    if (!weakest || r.rate < weakest.rate) weakest = { name: h.name, rate: r.rate };
  }

  const wd = weekdayRates(s, 7);
  const considered = wd.filter((x) => x.rate !== null && x.scheduled > 0);
  const bestDay = considered.length ? considered.reduce((a, b) => (a.rate! >= b.rate! ? a : b)).dow : null;
  const worstDay = considered.length > 1 ? considered.reduce((a, b) => (a.rate! <= b.rate! ? a : b)).dow : null;

  return {
    rate: cur.rate,
    scheduled: cur.scheduled,
    done: cur.done,
    delta: cur.rate !== null && prev.rate !== null ? cur.rate - prev.rate : null,
    strongest,
    weakest,
    bestDay,
    worstDay,
  };
}

/* -------------------------------- AI coach ------------------------------- */

const lines = (a: string[]) => a.join("\n");

export function coachTips(s: AppState): string[] {
  const tips: string[] = [];
  const t = today();

  const weekendDip = s.habits
    .filter((h) => h.status === "active" && h.weekdays.length >= 5)
    .map((h) => {
      const we = rateForRange(h, s.logs, addDays(t, -27), t);
      let wDone = 0, wSched = 0, eDone = 0, eSched = 0;
      for (let i = 0; i < 28; i++) {
        const d = addDays(t, -i);
        if (!isScheduled(h, d)) continue;
        const st = dayState(h, d, habitLog(s.logs, h.id, dkey(d)));
        if (st === "skipped") continue;
        const dow = d.getDay();
        if (dow === 0 || dow === 6) {
          eSched++;
          if (st === "done") eDone++;
        } else {
          wSched++;
          if (st === "done") wDone++;
        }
      }
      const wr = wSched ? wDone / wSched : null;
      const er = eSched ? eDone / eSched : null;
      return { h, wr, er };
    })
    .filter((x) => x.wr !== null && x.er !== null && x.wr! - x.er! >= 0.25);

  for (const { h, wr, er } of weekendDip)
    tips.push(
      `${h.name} is consistent on weekdays (${pct(wr)}) but drops on weekends (${pct(er)}). Try a shorter weekend version — even 15 minutes keeps the chain alive.`
    );

  const slipping = s.habits
    .filter((h) => h.status === "active")
    .map((h) => ({
      h,
      r7: rateForRange(h, s.logs, addDays(t, -6), t).rate,
      rPrev: rateForRange(h, s.logs, addDays(t, -13), addDays(t, -7)).rate,
    }))
    .filter((x) => x.r7 !== null && x.rPrev !== null && x.rPrev! - x.r7! >= 0.3);

  for (const { h, r7, rPrev } of slipping)
    tips.push(
      `${h.name} slipped from ${pct(rPrev)} to ${pct(r7)} in the last 7 days. Shrink it for a few days — a 5-minute version beats a skipped one.`
    );

  const review = weeklyReview(s);
  if (review.weakest && review.strongest && review.weakest.name !== review.strongest.name)
    tips.push(
      `${review.strongest.name} is your anchor at ${pct(review.strongest.rate)}. Stack ${review.weakest.name} right after it — momentum transfers.`
    );

  if (tips.length === 0)
    tips.push("No red flags this week. Consistency looks steady — protect your reminder times and keep showing up.");

  return tips.slice(0, 3);
}

export function coachReply(s: AppState, question: string): string {
  const q = question.toLowerCase();
  const t = today();
  const habits = s.habits.filter((h) => h.status === "active");

  const summary = habits.map((h) => {
    const st = habitStats(s, h);
    return { h, st, r7: rateForRange(h, s.logs, addDays(t, -6), t).rate };
  });

  if (q.includes("week") || q.includes("review")) {
    const w = weeklyReview(s);
    return lines([
      `Here's your weekly review:`,
      ``,
      `• Overall completion: ${pct(w.rate)} (${w.done}/${w.scheduled} check-ins)${w.delta !== null ? ` — ${w.delta >= 0 ? "up" : "down"} ${pct(Math.abs(w.delta)).replace("%", "")} pts vs the previous week` : ""}`,
      w.strongest ? `• Strongest habit: ${w.strongest.name} at ${pct(w.strongest.rate)}` : ``,
      w.weakest ? `• Needs attention: ${w.weakest.name} at ${pct(w.weakest.rate)}` : ``,
      w.bestDay !== null ? `• Best day: ${WEEKDAYS_LONG[w.bestDay]}` : ``,
      w.worstDay !== null ? `• Weakest day: ${WEEKDAYS_LONG[w.worstDay]}` : ``,
      ``,
      w.weakest
        ? `My suggestion: give ${w.weakest.name} a smaller target on ${w.worstDay !== null ? WEEKDAYS_LONG[w.worstDay].toLowerCase() + "s" : "your weak days"}. A habit you can finish on a bad day is the one that survives.`
        : `Add a few more days of tracking and I'll spot patterns for you.`,
    ]);
  }

  if (q.includes("consisten") || q.includes("losing") || q.includes("struggling") || q.includes("why")) {
    const slips = summary
      .filter((x) => x.st.rate30 !== null && x.st.rate30! < 0.7)
      .sort((a, b) => (a.st.rate30 ?? 1) - (b.st.rate30 ?? 1));
    if (!slips.length)
      return "Honestly? You're not losing consistency — every active habit is above 70% over 30 days. The risk now is boredom, not failure. Consider raising one target slightly to stay engaged.";
    const x = slips[0];
    const wd = weekdayRates(s, 60).filter((r) => r.rate !== null);
    const worst = wd.length ? wd.reduce((a, b) => (a.rate! <= b.rate! ? a : b)) : null;
    return lines([
      `The pattern I see: ${x.h.name} is your leak — ${pct(x.st.rate30)} over 30 days, current streak ${x.st.current}.`,
      worst ? `Across all habits, ${WEEKDAYS_LONG[worst.dow]} is your weakest day (${pct(worst.rate)}).` : ``,
      ``,
      `Three fixes that usually work:`,
      `1. Shrink the target — make it so small it feels almost silly to skip.`,
      `2. Anchor it — do it right after a habit that's already strong, like ${summary.sort((a, b) => (b.st.rate30 ?? 0) - (a.st.rate30 ?? 0))[0]?.h.name ?? "your best habit"}.`,
      `3. Set the reminder ${x.h.reminder ? `and actually honor ${x.h.reminder}` : "— this habit has no reminder time yet"}.`,
    ]);
  }

  if (q.includes("improve") || q.includes("suggest") || q.includes("new habit") || q.includes("what should")) {
    const has = new Set(habits.map((h) => h.name.toLowerCase()));
    const ideas = [
      { name: "Plan tomorrow", why: "a 5-minute nightly plan cuts morning decision fatigue", icon: "pen" },
      { name: "10-minute walk", why: "low-friction movement on days the gym feels heavy", icon: "dumbbell" },
      { name: "Review mistakes", why: "20 minutes fixing one bug teaches more than an hour of new code", icon: "code" },
      { name: "No phone first hour", why: "protects your best focus window of the day", icon: "clock" },
      { name: "Journal", why: "two sentences a day — it compounds into self-awareness", icon: "pen" },
    ].filter((i) => ![...has].some((n) => n.includes(i.name.toLowerCase().split(" ")[0])));
    return lines([
      `Based on your current mix, here's what I'd add — pick one, not all:`,
      ``,
      ...ideas.slice(0, 4).map((i) => `• ${i.name} — ${i.why}.`),
      ``,
      `You can create any of these from the Habits page → New habit. Want me to review your week instead? Ask "How was my week?"`,
    ]);
  }

  if (q.includes("streak")) {
    const best = summary.sort((a, b) => b.st.current - a.st.current)[0];
    const longest = summary.sort((a, b) => b.st.longest - a.st.longest)[0];
    return lines([
      `Streak snapshot:`,
      ``,
      ...summary.slice(0, 6).map((x) => `• ${x.h.name}: ${x.st.current} days now (record ${x.st.longest})`),
      ``,
      best
        ? `${best.h.name} is on fire at ${best.st.current} days. Rule of the streak: never miss twice — one miss is a slip, two is a new habit.`
        : `Complete habits today to start building streaks.`,
    ]);
  }

  if (q.includes("hello") || q.includes("hi ") || q === "hi") {
    return `Hey! Ask me things like "How was my week?", "Why am I losing consistency?" or "What should I improve?" — I'll answer from your actual tracking data.`;
  }

  // default: mini portrait
  const strong = summary.filter((x) => (x.st.rate30 ?? 0) >= 0.85);
  const weak = summary.filter((x) => (x.st.rate30 ?? 0) < 0.6);
  return lines([
    `Here's the short version of your habits right now:`,
    ``,
    ...summary.slice(0, 6).map((x) => `• ${x.h.name}: ${pct(x.st.rate30)} (30 days), streak ${x.st.current}`),
    ``,
    strong.length
      ? `Keep doing whatever ${strong[0].h.name} is doing — ${pct(strong[0].st.rate30)} is elite.`
      : ``,
    weak.length ? `Focus energy on ${weak[0].h.name} first. Ask "Why am I losing consistency?" for a plan.` : `Everything is above 60% — solid base. Ask "What should I improve?" for next steps.`,
  ]);
}
