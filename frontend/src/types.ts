export type CategoryId = "health" | "learning" | "productivity" | "personal";
export type HabitStatus = "active" | "paused" | "archived";

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: CategoryId;
  icon: string;
  color: string; // key into HABIT_COLORS
  weekdays: number[]; // 0 = Sunday … 6 = Saturday
  goal?: { value: number; unit: string };
  reminder?: string; // "HH:MM"
  startDate: string; // yyyy-mm-dd
  status: HabitStatus;
  createdAt: string;
}

export interface LogEntry {
  done: boolean;
  value?: number;
  skipped?: boolean;
  at?: number;
}

/** key: `${habitId}|${yyyy-mm-dd}` */
export type Logs = Record<string, LogEntry>;

export interface Profile {
  name: string;
  email: string;
  joinedAt: string;
}

export interface Settings {
  theme: "light" | "dark";
  weekStart: 0 | 1;
  notifications: boolean;
  coachTips: boolean;
}

export interface AppState {
  profile: Profile;
  settings: Settings;
  habits: Habit[];
  logs: Logs;
  /** true when running without a Supabase account (data stays on this device) */
  guest: boolean;
}

export type DayState =
  | "done"
  | "partial"
  | "skipped"
  | "missed"
  | "pending"
  | "unscheduled"
  | "future";

export type View =
  | { name: "dashboard" }
  | { name: "habits" }
  | { name: "habit"; id: string }
  | { name: "calendar" }
  | { name: "stats" }
  | { name: "coach" }
  | { name: "profile" }
  | { name: "settings" };

export type NavFn = (v: View) => void;

export const CATEGORIES: Record<
  CategoryId,
  { label: string; icon: string; color: string; soft: string; deep: string }
> = {
  health: { label: "Health", icon: "heart", color: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)" },
  learning: { label: "Learning", icon: "book", color: "var(--teal)", soft: "var(--teal-soft)", deep: "var(--teal-deep)" },
  productivity: { label: "Productivity", icon: "target", color: "var(--gold)", soft: "var(--gold-soft)", deep: "var(--gold-deep)" },
  personal: { label: "Personal", icon: "leaf", color: "var(--plum)", soft: "var(--plum-soft)", deep: "var(--plum-deep)" },
};

export const HABIT_COLORS: Record<string, { base: string; soft: string; deep: string; label: string }> = {
  leaf: { base: "var(--leaf)", soft: "var(--leaf-soft)", deep: "var(--leaf-deep)", label: "Fern" },
  teal: { base: "var(--teal)", soft: "var(--teal-soft)", deep: "var(--teal-deep)", label: "Tide" },
  gold: { base: "var(--gold)", soft: "var(--gold-soft)", deep: "var(--gold-deep)", label: "Marigold" },
  coral: { base: "var(--coral)", soft: "var(--coral-soft)", deep: "var(--coral-deep)", label: "Coral" },
  plum: { base: "var(--plum)", soft: "var(--plum-soft)", deep: "var(--plum-deep)", label: "Plum" },
  pine: { base: "var(--pine)", soft: "var(--pine-soft)", deep: "var(--pine-deep)", label: "Pine" },
};

export const HABIT_ICONS = ["code", "dumbbell", "book", "droplet", "globe", "moon", "leaf", "pen", "heart", "target", "clock", "spark"] as const;
