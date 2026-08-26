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

/* --------------------------------- rates -------------------------------- */

export function rateForRange(h: Habit, logs: Logs, from: Date, to: Date) {
  let done = 0;
  let scheduled = 0;
  let d = new Date(from);
  const t = today();
  if (to > t) to = t;
  while (d <= to) {
    if (isScheduled(h, d)) {
      const st = dayState(h, d, habitLog(logs, h.id, dkey(d)));
      if (st !== "skipped") {
        scheduled++;
        if (st === "done") done++;
      }
    }
    d = addDays(d, 1);
  }
  return { done, scheduled, rate: scheduled ? done / scheduled : null };
}

export function totalCompletions(s: AppState): number {
  let n = 0;
  for (const k in s.logs) if (s.logs[k].done) n++;
  return n;
}

export function perfectDays(s: AppState): number {
  const starts = s.habits.filter((h) => h.status !== "archived").map((h) => parseKey(h.startDate));
  if (!starts.length) return 0;
  let d = starts.reduce((a, b) => (a < b ? a : b));
  const t = today();
  let n = 0;
  while (d <= t) {
    if (dayWin(s, d) === true) n++;
    d = addDays(d, 1);
  }
  return n;
}

export function weeklySeries(s: AppState, weeks: number, weekStart: 0 | 1) {
  const out: { label: string; rate: number | null; done: number; scheduled: number; current: boolean }[] = [];
  const thisWeek = startOfWeek(today(), weekStart);
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(thisWeek, -7 * i);
    const to = addDays(from, 6);
    let done = 0;
    let scheduled = 0;
    for (const h of s.habits) {
      if (h.status !== "active") continue;
      const r = rateForRange(h, s.logs, from, to);
      done += r.done;
      scheduled += r.scheduled;
    }
    out.push({
      label: fmtShort(from),
      rate: scheduled ? done / scheduled : null,
      done,
      scheduled,
      current: i === 0,
    });
  }
  return out;
}

const logs0 = (s: AppState) => s.logs;

export function weekdayRates(s: AppState, days = 90) {
  const out = Array.from({ length: 7 }, () => ({ done: 0, scheduled: 0 }));
  const from = addDays(today(), -days);
  for (const h of s.habits) {
    if (h.status !== "active") continue;
    let d = new Date(from);
    const t = today();
    while (d <= t) {
      if (isScheduled(h, d)) {
        const st = dayState(h, d, habitLog(logs0(s), h.id, dkey(d)));
        if (st !== "skipped") {
          out[d.getDay()].scheduled++;
          if (st === "done") out[d.getDay()].done++;
        }
      }
      d = addDays(d, 1);
    }
  }
  return out.map((o) => ({ ...o, rate: o.scheduled ? o.done / o.scheduled : null }));
}

export interface HabitStats {
  current: number;
  longest: number;
  rate30: number | null;
  scheduled30: number;
  total: number;
}

export function habitStats(s: AppState, h: Habit): HabitStats {
  const from = addDays(today(), -29);
  const r = rateForRange(h, s.logs, from, today());
  let total = 0;
  for (const k in s.logs) if (k.startsWith(h.id + "|") && s.logs[k].done) total++;
  return {
    current: currentStreak(h, s.logs),
    longest: longestStreak(h, s.logs),
    rate30: r.rate,
    scheduled30: r.scheduled,
    total,
  };
}

export function recentActivity(s: AppState, limit = 6) {
  const items: { habit: Habit; date: Date; done: boolean; value?: number }[] = [];
  for (const k in s.logs) {
    const [hid, dk] = k.split("|");
    const h = s.habits.find((x) => x.id === hid);
    if (!h) continue;
    const e = s.logs[k];
    if (e.done || (e.value ?? 0) > 0) items.push({ habit: h, date: parseKey(dk), done: e.done, value: e.value });
  }
  items.sort((a, b) => (b.date.getTime() - a.date.getTime()));
  return items.slice(0, limit);
}

export function lastNDays(s: AppState, h: Habit, n: number): { date: Date; state: DayState }[] {
  const out: { date: Date; state: DayState }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today(), -i);
    out.push({ date: d, state: dayState(h, d, habitLog(s.logs, h.id, dkey(d))) });
  }
  return out;
}

/* ------------------------------ coach brain ------------------------------ */

function weekendSplit(h: Habit, logs: Logs) {
  const from = addDays(today(), -56);
  const wd = { done: 0, scheduled: 0 };
  const we = { done: 0, scheduled: 0 };
  let d = new Date(from);
  const t = today();
  while (d <= t) {
    if (isScheduled(h, d)) {
      const st = dayState(h, d, habitLog(logs, h.id, dkey(d)));
      if (st !== "skipped") {
        const bucket = d.getDay() === 0 || d.getDay() === 6 ? we : wd;
        bucket.scheduled++;
        if (st === "done") bucket.done++;
      }
    }
    d = addDays(d, 1);
  }
  return {
    weekday: wd.scheduled ? wd.done / wd.scheduled : null,
    weekend: we.scheduled ? we.done / we.scheduled : null,
  };
}

export function weeklyReview(s: AppState) {
  const series = weeklySeries(s, 2, s.settings.weekStart);
  const cur = series[1];
  const prev = series[0];
  const active = s.habits.filter((h) => h.status === "active");
  const rated = active
    .map((h) => ({ h, r: rateForRange(h, s.logs, addDays(today(), -29), today()) }))
    .filter((x) => x.r.scheduled >= 3)
    .sort((a, b) => (b.r.rate ?? 0) - (a.r.rate ?? 0));
  const wd = weekdayRates(s, 60).filter((x) => x.scheduled >= 2);
  const sorted = [...wd].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  return {
    rate: cur?.rate ?? null,
    prevRate: prev?.rate ?? null,
    delta: cur?.rate != null && prev?.rate != null ? cur.rate - prev.rate : null,
    done: cur?.done ?? 0,
    scheduled: cur?.scheduled ?? 0,
    strongest: rated[0]?.h ?? null,
    weakest: rated.length > 1 ? rated[rated.length - 1].h : null,
    bestDay: sorted[0] ? wd.indexOf(sorted[0]) : null,
    worstDay: sorted.length > 1 ? wd.indexOf(sorted[sorted.length - 1]) : null,
  };
}

function findSlipping(s: AppState) {
  const out: { h: Habit; last7: number | null; prev7: number | null; delta: number }[] = [];
  for (const h of s.habits) {
    if (h.status !== "active") continue;
    const a = rateForRange(h, s.logs, addDays(today(), -6), today());
    const b = rateForRange(h, s.logs, addDays(today(), -13), addDays(today(), -7));
    if (a.rate == null || b.rate == null) continue;
    out.push({ h, last7: a.rate, prev7: b.rate, delta: a.rate - b.rate });
  }
  return out.sort((x, y) => x.delta - y.delta);
}

const habitLine = (h: Habit, s: AppState) => {
  const st = habitStats(s, h);
  const split = weekendSplit(h, s.logs);
  const bits = [`${h.name} is at ${pct(st.rate30)} over the last 30 days (${st.total} total completions), with a current streak of ${st.current} day${st.current === 1 ? "" : "s"} and a best of ${st.longest}.`];
  if (split.weekday != null && split.weekend != null && Math.abs(split.weekday - split.weekend) > 0.18) {
    bits.push(
      split.weekend < split.weekday
        ? `Pattern found: ${pct(split.weekday)} on weekdays but only ${pct(split.weekend)} on weekends — weekends are your leak. Try a shorter ${h.goal ? h.goal.unit + " " : ""}session on Sat/Sun so the chain survives.`
        : `Pattern found: you actually do better on weekends (${pct(split.weekend)}) than weekdays (${pct(split.weekday)}). Busy weekdays are the risk — anchor ${h.name} to a fixed weekday time.`
    );
  }
  if (h.reminder) bits.push(`Your ${fmtTime(h.reminder)} reminder is a good anchor — keep the phone nearby at that time.`);
  return bits.join("\n\n");
};

const fmtTime = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

export function coachReply(s: AppState, q: string): string {
  const text = q.toLowerCase();
  const review = weeklyReview(s);
  const name = s.profile.name.split(" ")[0];

  const mentioned = s.habits.find((h) => text.includes(h.name.toLowerCase()) || h.name.toLowerCase().split(" ").some((w) => w.length > 3 && text.includes(w)));

  if (mentioned) return habitLine(mentioned, s);

  if (/(week|review|how was)/.test(text)) {
    const lines = [
      `Here's your week so far, ${name}:`,
      `• Completion: ${pct(review.rate)} (${review.done} of ${review.scheduled} check-ins${review.delta != null ? `, ${review.delta >= 0 ? "up" : "down"} ${Math.abs(Math.round(review.delta * 100))} pts vs last week` : ""})`,
    ];
    if (review.strongest) lines.push(`• Strongest habit: ${review.strongest.name}`);
    if (review.weakest) lines.push(`• Needs attention: ${review.weakest.name}`);
    if (review.bestDay != null) lines.push(`• Best day: ${WEEKDAYS_LONG[review.bestDay]}`);
    if (review.worstDay != null) lines.push(`• Weakest day: ${WEEKDAYS_LONG[review.worstDay]}`);
    if (review.weakest) {
      const split = weekendSplit(review.weakest, s.logs);
      lines.push("");
      lines.push(
        split.weekend != null && split.weekday != null && split.weekend < split.weekday - 0.15
          ? `Suggestion: ${review.weakest.name} drops hard on weekends. Schedule a lighter weekend version — half the usual target — so the streak never breaks.`
          : `Suggestion: protect a 10-minute version of ${review.weakest.name} for your weakest day. Tiny reps keep the identity alive.`
      );
    }
    return lines.join("\n");
  }

  if (/(why|miss|struggl|fail|losing|slip)/.test(text)) {
    const target = review.weakest ?? s.habits.find((h) => h.status === "active");
    if (!target) return "You have no active habits yet — create one and I'll start watching your patterns.";
    const st = habitStats(s, target);
    const split = weekendSplit(target, s.logs);
    const lines = [
      `The habit you're most likely losing is ${target.name} — ${pct(st.rate30)} over 30 days.`,
    ];
    if (split.weekday != null && split.weekend != null) {
      lines.push(`Weekdays: ${pct(split.weekday)} · Weekends: ${pct(split.weekend)}.`);
      if (split.weekend < split.weekday - 0.15)
        lines.push(`That gap says the routine breaks when your schedule does. Weekends have no fixed trigger — give ${target.name} one (e.g. right after breakfast).`);
    }
    lines.push(`Three fixes that usually work:\n• Shrink it: a 10-minute version counts.\n• Anchor it: attach it to something you already do.\n• Rescue rule: if you miss, the next day is non-negotiable — never miss twice.`);
    return lines.join("\n\n");
  }

  if (/(improve|fix|better|advice|focus|next)/.test(text)) {
    const slip = findSlipping(s).filter((x) => x.delta < -0.1);
    const lines: string[] = [];
    if (slip.length) {
      lines.push("What's slipping right now:");
      slip.slice(0, 2).forEach((x) =>
        lines.push(`• ${x.h.name}: ${pct(x.prev7)} → ${pct(x.last7)} week-over-week. Recover it with a minimum-viable version today.`)
      );
    } else {
      lines.push("Nothing is actively slipping — nice. To level up:");
      if (review.weakest) lines.push(`• Raise the floor on ${review.weakest.name}: same schedule, 20% smaller target for two weeks.`);
      lines.push("• Stack a new micro-habit after your strongest one — momentum transfers.");
    }
    if (review.worstDay != null) lines.push(`• Guard ${WEEKDAYS_LONG[review.worstDay]}: it's your weakest day. Plan it the night before.`);
    return lines.join("\n");
  }

  if (/(suggest|new habit|ideas?|add|start|create)/.test(text)) {
    const cats = new Set(s.habits.filter((h) => h.status !== "archived").map((h) => h.category));
    const ideas: string[] = [];
    if (!cats.has("personal")) ideas.push("• Evening Journal — 10 min before bed. Clears the head, and it lands in the Personal category you haven't used yet.");
    if (!cats.has("productivity")) ideas.push("• Plan Tomorrow — 5 min each night. Decide your top task so mornings start with direction.");
    ideas.push("• 20-minute Walk — after lunch. Low effort, high return, stacks well after a morning habit.");
    if (s.habits.some((h) => /read/i.test(h.name))) ideas.push("• Read 20 Pages — you're strong at reading; a stretch target on weekends uses that momentum.");
    return `A few habits that would fit your current mix:\n\n${ideas.slice(0, 4).join("\n")}\n\nOpen the Habits tab and add whichever one you'd actually do on a bad day — that's the right bar.`;
  }

  if (/streak/.test(text)) {
    const o = overallCurrentStreak(s);
    const best = overallLongestStreak(s);
    const top = s.habits
      .filter((h) => h.status === "active")
      .map((h) => ({ h, c: currentStreak(h, s.logs) }))
      .sort((a, b) => b.c - a.c)[0];
    return `Your all-habits streak is ${o} day${o === 1 ? "" : "s"} (best ever: ${best}). ${
      top ? `${top.h.name} is leading the pack at ${top.c} days.` : ""
    } Remember: a streak only needs the minimum version of each habit. Protect the chain, polish it later.`;
  }

  const o = overallCurrentStreak(s);
  return `Quick read on your system, ${name}:\n\n• This week you're at ${pct(review.rate)} completion.\n• All-habits streak: ${o} day${o === 1 ? "" : "s"}.\n• Strongest: ${review.strongest?.name ?? "—"} · Weakest: ${review.weakest?.name ?? "—"}.\n\nAsk me things like “How was my week?”, “Why do I keep missing ${review.weakest?.name ?? "a habit"}?” or “Suggest new habits” — I analyze everything on-device, nothing leaves your browser.`;
}

export function coachTip(s: AppState): string {
  const slip = findSlipping(s).find((x) => x.delta < -0.12);
  if (slip) return `${slip.h.name} dropped from ${pct(slip.prev7)} to ${pct(slip.last7)} this week — ask the coach for a rescue plan.`;
  const review = weeklyReview(s);
  if (review.weakest) {
    const split = weekendSplit(review.weakest, s.logs);
    if (split.weekend != null && split.weekday != null && split.weekend < split.weekday - 0.2)
      return `${review.weakest.name} is strong on weekdays (${pct(split.weekday)}) but leaks on weekends (${pct(split.weekend)}).`;
  }
  if (review.rate != null && review.rate >= 0.85) return `You're at ${pct(review.rate)} this week — a great time to raise one target slightly.`;
  return `You're at ${pct(review.rate)} this week. One rescued habit today beats a perfect tomorrow.`;
}
