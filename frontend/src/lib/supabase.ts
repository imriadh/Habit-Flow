/**
 * Supabase client + cloud sync layer.
 *
 * - If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set (frontend/.env),
 *   the app signs users in with Supabase Auth and syncs habits, logs,
 *   profile and settings to the Supabase PostgreSQL database
 *   (tables are created by backend/supabase/schema.sql).
 * - If they are missing, `supabase` is null and the app runs in local
 *   demo mode (data stays in this browser via localStorage).
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppState, CategoryId, Habit, HabitStatus, Logs, Profile, Settings } from "../types";
import { logKey } from "./dates";

const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const cloudEnabled = supabase !== null;

/* --------------------------------- auth ---------------------------------- */

export async function signUp(email: string, password: string, name: string): Promise<User | null> {
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOutUser() {
  await supabase!.auth.signOut();
}

export function onAuthChange(cb: (user: User | null) => void) {
  const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return data.subscription;
}

/* ------------------------------ row mapping ------------------------------ */

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  color: string;
  weekdays: number[];
  goal_value: number | null;
  goal_unit: string | null;
  reminder_time: string | null;
  start_date: string;
  status: string;
  created_at: string;
}

interface LogRow {
  habit_id: string;
  log_date: string;
  completed: boolean;
  value: number | null;
  skipped: boolean;
  logged_at: string;
}

const rowToHabit = (r: HabitRow): Habit => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  category: r.category as CategoryId,
  icon: r.icon,
  color: r.color,
  weekdays: r.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
  goal: r.goal_value ? { value: Number(r.goal_value), unit: r.goal_unit ?? "times" } : undefined,
  reminder: r.reminder_time ? r.reminder_time.slice(0, 5) : undefined,
  startDate: r.start_date.slice(0, 10),
  status: r.status as HabitStatus,
  createdAt: r.created_at.slice(0, 10),
});

const habitToRow = (userId: string, h: Habit) => ({
  id: h.id,
  user_id: userId,
  name: h.name,
  description: h.description ?? null,
  category: h.category,
  icon: h.icon,
  color: h.color,
  weekdays: h.weekdays,
  goal_value: h.goal?.value ?? null,
  goal_unit: h.goal?.unit ?? null,
  reminder_time: h.reminder ?? null,
  start_date: h.startDate,
  status: h.status,
});

/* --------------------------------- pull ---------------------------------- */

export interface CloudData {
  habits: Habit[];
  logs: Logs;
  profile: Profile | null;
  settings: Partial<Settings> | null;
}

/** Downloads everything belonging to the signed-in user. */
export async function pullCloud(userId: string): Promise<CloudData | null> {
  if (!supabase) return null;
  try {
    const [profileRes, settingsRes, habitsRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("habits").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("habit_logs").select("habit_id, log_date, completed, value, skipped, logged_at").eq("user_id", userId),
    ]);
    if (habitsRes.error || logsRes.error) {
      console.warn("HabitFlow: cloud pull failed", habitsRes.error ?? logsRes.error);
      return null;
    }
    const logs: Logs = {};
    for (const r of (logsRes.data ?? []) as LogRow[]) {
      logs[logKey(r.habit_id, r.log_date.slice(0, 10))] = {
        done: r.completed,
        value: r.value === null ? undefined : Number(r.value),
        skipped: r.skipped || undefined,
        at: new Date(r.logged_at).getTime(),
      };
    }
    const p = profileRes.data as { name: string; email: string | null; created_at: string } | null;
    const st = settingsRes.data as
      | { theme: string; week_start: number; notifications: boolean; coach_tips: boolean }
      | null;
    return {
      habits: ((habitsRes.data ?? []) as HabitRow[]).map(rowToHabit),
      logs,
      profile: p
        ? { name: p.name || "Friend", email: p.email ?? "", joinedAt: (p.created_at ?? "").slice(0, 10) }
        : null,
      settings: st
        ? {
            theme: st.theme === "dark" ? "dark" : "light",
            weekStart: st.week_start === 0 ? 0 : 1,
            notifications: !!st.notifications,
            coachTips: !!st.coach_tips,
          }
        : null,
    };
  } catch (e) {
    console.warn("HabitFlow: cloud pull error", e);
    return null;
  }
}

/* --------------------------------- push ---------------------------------- */

const ignore = (p: PromiseLike<unknown>) =>
  Promise.resolve(p).catch((e) => console.warn("HabitFlow: sync failed", e));

export function pushHabit(userId: string, h: Habit) {
  if (!supabase) return;
  ignore(supabase.from("habits").upsert(habitToRow(userId, h), { onConflict: "id" }));
}

export function pushHabitDelete(userId: string, habitId: string) {
  if (!supabase) return;
  ignore(supabase.from("habits").delete().eq("user_id", userId).eq("id", habitId));
}

/** entry === null deletes that day's log */
export function pushLog(
  userId: string,
  habitId: string,
  dateKey: string,
  entry: { done: boolean; value?: number; skipped?: boolean } | null
) {
  if (!supabase) return;
  if (entry === null) {
    ignore(
      supabase.from("habit_logs").delete().eq("user_id", userId).eq("habit_id", habitId).eq("log_date", dateKey)
    );
    return;
  }
  ignore(
    supabase.from("habit_logs").upsert(
      {
        user_id: userId,
        habit_id: habitId,
        log_date: dateKey,
        completed: entry.done,
        value: entry.value ?? null,
        skipped: !!entry.skipped,
      },
      { onConflict: "habit_id,log_date" }
    )
  );
}

export function pushProfile(userId: string, p: Profile) {
  if (!supabase) return;
  ignore(supabase.from("profiles").upsert({ id: userId, name: p.name, email: p.email }));
}

export function pushSettings(userId: string, st: Settings) {
  if (!supabase) return;
  ignore(
    supabase.from("user_settings").upsert({
      user_id: userId,
      theme: st.theme,
      week_start: st.weekStart,
      notifications: st.notifications,
      coach_tips: st.coachTips,
    })
  );
}

/** Wipes the user's cloud data (used by "reset demo data"). */
export function clearCloud(userId: string) {
  if (!supabase) return;
  ignore(supabase.from("habit_logs").delete().eq("user_id", userId));
  ignore(supabase.from("habits").delete().eq("user_id", userId));
}

/** Uploads the full local state (used on first login with an empty account). */
export function pushAll(userId: string, s: AppState) {
  if (!supabase) return;
  for (const h of s.habits) pushHabit(userId, h);
  for (const k in s.logs) {
    const [habitId, dateKey] = k.split("|");
    pushLog(userId, habitId, dateKey, s.logs[k]);
  }
  pushProfile(userId, s.profile);
  pushSettings(userId, s.settings);
}
