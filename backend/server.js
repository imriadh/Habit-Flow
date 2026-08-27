/**
 * HabitFlow API — Node.js + Express middle layer
 *
 *   React frontend  →  this API  →  Supabase PostgreSQL / Groq AI
 *
 * - Auth uses Supabase Auth (sign up / sign in). The frontend sends the
 *   user's access token in `Authorization: Bearer <token>` on every request.
 * - Secrets (service-role key, Groq key) live ONLY on this server.
 * - The AI endpoint sends a small anonymized summary to Groq — never raw logs.
 *
 * Run:  cp .env.example .env  →  fill values  →  npm install  →  npm run dev
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const {
  PORT = 4000,
  CLIENT_ORIGIN = "http://localhost:5173",
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in backend/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const admin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : supabase;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN.split(",") }));
app.use(express.json({ limit: "100kb" }));

/* ------------------------------ middleware -------------------------------- */

/** Verifies the Supabase JWT and attaches req.userId */
async function requireUser(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token." });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired token." });
  req.userId = data.user.id;
  next();
}

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: "We couldn't complete that request. Please try again." });
});

/* --------------------------------- auth ----------------------------------- */

app.post("/api/auth/register", wrap(async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: "Valid email and a password of 6+ characters are required." });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name || "" } },
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body ?? {};
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: "Incorrect email or password." });
  res.json({ user: data.user, session: data.session });
}));

app.get("/api/auth/me", requireUser, wrap(async (req, res) => {
  const { data } = await supabase.auth.getUser(req.headers.authorization.slice(7));
  res.json({ user: data.user });
}));

/* -------------------------------- habits ---------------------------------- */

app.get("/api/habits", requireUser, wrap(async (req, res) => {
  const { data, error } = await admin.from("habits").select("*").eq("user_id", req.userId).order("created_at");
  if (error) throw error;
  res.json(data);
}));

app.post("/api/habits", requireUser, wrap(async (req, res) => {
  const { name, description, category, icon, color, weekdays, goal_value, goal_unit, reminder_time, start_date } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Habit name is required." });
  const { data, error } = await admin
    .from("habits")
    .insert({
      user_id: req.userId,
      name: String(name).slice(0, 60),
      description: description ?? null,
      category: category ?? "personal",
      icon: icon ?? "leaf",
      color: color ?? "leaf",
      weekdays: weekdays ?? [0, 1, 2, 3, 4, 5, 6],
      goal_value: goal_value ?? null,
      goal_unit: goal_unit ?? null,
      reminder_time: reminder_time ?? null,
      start_date: start_date ?? new Date().toISOString().slice(0, 10),
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json(data);
}));

app.put("/api/habits/:id", requireUser, wrap(async (req, res) => {
  const { data, error } = await admin
    .from("habits")
    .update({ ...req.body, id: undefined, user_id: undefined })
    .eq("id", req.params.id)
    .eq("user_id", req.userId) // ownership check — users can only touch their rows
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Habit not found." });
  res.json(data);
}));

app.delete("/api/habits/:id", requireUser, wrap(async (req, res) => {
  const { error } = await admin.from("habits").delete().eq("id", req.params.id).eq("user_id", req.userId);
  if (error) throw error;
  res.status(204).end();
}));

/* ------------------------------- habit logs -------------------------------- */

app.post("/api/habits/:id/log", requireUser, wrap(async (req, res) => {
  const { date, completed, value, skipped } = req.body ?? {};
  if (!date) return res.status(400).json({ error: "date (yyyy-mm-dd) is required." });
  const { data, error } = await admin
    .from("habit_logs")
    .upsert(
      { user_id: req.userId, habit_id: req.params.id, log_date: date, completed: !!completed, value: value ?? null, skipped: !!skipped },
      { onConflict: "habit_id,log_date" }
    )
    .select()
    .single();
  if (error) throw error;
  res.json(data);
}));

app.get("/api/habits/:id/history", requireUser, wrap(async (req, res) => {
  const { from, to } = req.query;
  let q = admin.from("habit_logs").select("*").eq("user_id", req.userId).eq("habit_id", req.params.id).order("log_date");
  if (from) q = q.gte("log_date", from);
  if (to) q = q.lte("log_date", to);
  const { data, error } = await q;
  if (error) throw error;
  res.json(data);
}));

/* ------------------------------ dashboard/stats ----------------------------- */

app.get("/api/dashboard", requireUser, wrap(async (req, res) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [habitsRes, logsRes] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", req.userId).eq("status", "active"),
    admin.from("habit_logs").select("habit_id, log_date, completed, value, skipped").eq("user_id", req.userId).eq("log_date", todayIso),
  ]);
  if (habitsRes.error || logsRes.error) throw habitsRes.error ?? logsRes.error;
  const logs = new Map((logsRes.data ?? []).map((l) => [l.habit_id, l]));
  const due = (habitsRes.data ?? []).filter((h) => (h.weekdays ?? []).includes(new Date().getDay()));
  const done = due.filter((h) => logs.get(h.id)?.completed).length;
  res.json({
    date: todayIso,
    total: due.length,
    completed: done,
    rate: due.length ? done / due.length : null,
    habits: habitsRes.data ?? [],
  });
}));

/* ---------------------------------- AI ------------------------------------- */

/** Builds a tiny anonymized summary — no emails, names or raw history. */
async function buildSummary(userId) {
  const [habitsRes, logsRes] = await Promise.all([
    admin.from("habits").select("id, name, weekdays, status").eq("user_id", userId).eq("status", "active"),
    admin.from("habit_logs").select("habit_id, log_date, completed").eq("user_id", userId),
  ]);
  if (habitsRes.error || logsRes.error) throw habitsRes.error ?? logsRes.error;
  const habits = habitsRes.data ?? [];
  const logs = logsRes.data ?? [];
  const cut = new Date();
  cut.setDate(cut.getDate() - 30);
  const per = habits.map((h) => {
    const rows = logs.filter((l) => l.habit_id === h.id && new Date(l.log_date) >= cut);
    const done = rows.filter((l) => l.completed).length;
    return `${h.name}: ${rows.length ? Math.round((done / rows.length) * 100) : 0}% completion (last 30 days, ${rows.length} tracked days)`;
  });
  return per.join("\n");
}

async function askGroq(system, user) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

app.post("/api/ai/advice", requireUser, wrap(async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: "AI is not configured on this server yet." });
  const summary = await buildSummary(req.userId);
  const answer = await askGroq(
    "You are HabitFlow Coach. Give short, practical, encouraging habit advice (max 120 words) based only on the statistics provided. No medical claims.",
    `User question: ${String(req.body?.question ?? "How can I improve?")}\n\nHabit statistics:\n${summary}`
  );
  res.json({ answer });
}));

app.get("/api/ai/weekly-review", requireUser, wrap(async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: "AI is not configured on this server yet." });
  const summary = await buildSummary(req.userId);
  const answer = await askGroq(
    "You are HabitFlow Coach. Write a brief weekly review (max 100 words): what went well, one weak spot, one concrete suggestion.",
    `Summarize this week based on these 30-day habit statistics:\n${summary}`
  );
  res.json({ answer });
}));

/* ---------------------------------- boot ------------------------------------ */

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "habitflow-api" }));

app.listen(PORT, () => {
  console.log(`HabitFlow API running on http://localhost:${PORT}`);
});
