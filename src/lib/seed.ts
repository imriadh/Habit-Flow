import type { AppState, Habit, LogEntry, Logs } from "../types";
import { addDays, dkey, logKey, today } from "./dates";

/** deterministic PRNG so the demo data tells the same story everywhere */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(): AppState {
  const rnd = mulberry32(20250827);
  const t = today();
  const start = (daysAgo: number) => dkey(addDays(t, -daysAgo));

  const habits: Habit[] = [
    {
      id: "h-prog",
      name: "Study Programming",
      description: "Deep work on code — course projects, problem sets and side builds.",
      category: "learning",
      icon: "code",
      color: "teal",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      reminder: "20:00",
      startDate: start(63),
      status: "active",
      createdAt: start(63),
    },
    {
      id: "h-ex",
      name: "Exercise",
      description: "Gym session, run or a solid home workout.",
      category: "health",
      icon: "dumbbell",
      color: "coral",
      weekdays: [1, 2, 3, 4, 5],
      reminder: "07:30",
      startDate: start(56),
      status: "active",
      createdAt: start(56),
    },
    {
      id: "h-read",
      name: "Read Book",
      description: "At least 10 pages — currently “Atomic Habits”.",
      category: "learning",
      icon: "book",
      color: "leaf",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      reminder: "21:30",
      startDate: start(70),
      status: "active",
      createdAt: start(70),
    },
    {
      id: "h-water",
      name: "Drink Water",
      description: "Keep a bottle on the desk all day.",
      category: "health",
      icon: "droplet",
      color: "pine",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      goal: { value: 8, unit: "glasses" },
      reminder: "10:00",
      startDate: start(68),
      status: "active",
      createdAt: start(68),
    },
    {
      id: "h-eng",
      name: "Practice English",
      description: "Speaking practice, essays or vocabulary reps.",
      category: "learning",
      icon: "globe",
      color: "gold",
      weekdays: [0, 2, 4, 6],
      reminder: "18:00",
      startDate: start(45),
      status: "active",
      createdAt: start(45),
    },
    {
      id: "h-sleep",
      name: "Sleep Early",
      description: "Lights out before midnight.",
      category: "health",
      icon: "moon",
      color: "plum",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      reminder: "23:00",
      startDate: start(40),
      status: "active",
      createdAt: start(40),
    },
  ];

  // per-habit success probability by day-of-week — the "story" the coach finds
  const prob: Record<string, number[]> = {
    "h-prog": [0.45, 0.92, 0.9, 0.94, 0.9, 0.88, 0.42], // Sun..Sat — weekend dip
    "h-ex": [0, 0.8, 0.84, 0.78, 0.82, 0.74, 0], // Mon–Fri only
    "h-read": [0.94, 0.93, 0.95, 0.92, 0.94, 0.93, 0.92],
    "h-water": [0.7, 0.85, 0.86, 0.84, 0.85, 0.82, 0.72],
    "h-eng": [0.72, 0, 0.68, 0, 0.7, 0, 0.66],
    "h-sleep": [0.6, 0.7, 0.72, 0.66, 0.68, 0.64, 0.55],
  };

  const logs: Logs = {};
  const put = (hid: string, d: Date, e: LogEntry) => {
    logs[logKey(hid, dkey(d))] = { ...e, at: d.getTime() + 12 * 3600000 + Math.floor(rnd() * 6 * 3600000) };
  };

  for (const h of habits) {
    const startD = new Date(
      Number(h.startDate.slice(0, 4)),
      Number(h.startDate.slice(5, 7)) - 1,
      Number(h.startDate.slice(8, 10))
    );
    let d = new Date(startD);
    while (d < t) {
      const dow = d.getDay();
      const p = prob[h.id][dow];
      if (p > 0) {
        const r = rnd();
        if (h.goal) {
          if (r < p) put(h.id, d, { done: true, value: h.goal.value + (rnd() < 0.3 ? 1 : 0) });
          else if (r < p + 0.22) put(h.id, d, { done: false, value: 3 + Math.floor(rnd() * 5) });
          else if (r < p + 0.26) put(h.id, d, { done: false, skipped: true });
        } else {
          if (r < p) put(h.id, d, { done: true });
          else if (r < p + 0.05) put(h.id, d, { done: false, skipped: true });
        }
      }
      d = addDays(d, 1);
    }
  }

  // guarantee the recent story: 2 perfect days, then a break, today partially underway
  const force = (daysAgo: number, all: boolean) => {
    const d = addDays(t, -daysAgo);
    for (const h of habits) {
      if (!h.weekdays.includes(d.getDay())) continue;
      const k = logKey(h.id, dkey(d));
      if (all) logs[k] = { done: true, value: h.goal?.value, at: d.getTime() + 14 * 3600000 };
      else delete logs[k];
    }
  };
  force(1, true);
  force(2, true);
  force(3, false); // exercise + others missed → overall streak = 2

  // today: a head start, but still work to do
  logs[logKey("h-prog", dkey(t))] = { done: true, at: t.getTime() + 9 * 3600000 };
  if (habits[1].weekdays.includes(t.getDay()))
    logs[logKey("h-ex", dkey(t))] = { done: true, at: t.getTime() + 8 * 3600000 };
  logs[logKey("h-water", dkey(t))] = { done: false, value: 5, at: t.getTime() + 10 * 3600000 };

  return {
    profile: { name: "Alex Carter", email: "alex.carter@campus.edu", joinedAt: start(70) },
    settings: { theme: "light", weekStart: 1, notifications: false, coachTips: true },
    habits,
    logs,
  };
}
