# HabitFlow — Personal Habit Tracking and Improvement System

A calm, data-driven habit tracker for students: daily one-tap check-ins, streaks
that survive real life, a visual calendar, statistics, and a private AI coach.

```
habitflow/
├── frontend/               React + pure CSS (no CSS framework) + Supabase client
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.tsx         auth gate + routing + reminders
│       ├── store.tsx       state + localStorage + Supabase sync
│       ├── lib/            dates, stats/streaks, coach engine, supabase client
│       ├── components/     icons (hand-drawn SVG), UI kit, shell, habit modal
│       └── views/          Auth, Dashboard, Habits, Detail, Calendar, Stats, Coach, Profile/Settings
│
├── backend/                Node.js + Express API (middle layer)
│   ├── server.js           auth / habits / logs / stats / Groq AI routes
│   └── supabase/schema.sql ← paste into the Supabase SQL Editor
│
└── (root src/ is only a thin build shim for the live preview)
```

## 1) Database — Supabase (≈5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email**: enable it (disable *Confirm email* for an instant demo login).
3. **SQL Editor → New query**: paste the entire `backend/supabase/schema.sql` and run it.
   It creates `profiles`, `habits`, `habit_logs`, `user_settings`, a trigger that
   creates a profile on sign-up, and Row Level Security policies so every user
   only ever sees their own data.
4. **Project Settings → API**: copy *Project URL* + *anon public* key.

## 2) Frontend — React + pure CSS

```bash
cd frontend
cp .env.example .env        # paste VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                 # http://localhost:5173
```

- Styling is **100% hand-written CSS** (`frontend/src/index.css`) — Bricolage
  Grotesque + Instrument Sans, light/dark themes, no CSS framework.
- Without `.env` keys the app runs in **demo mode** (localStorage, seeded with
  10 weeks of sample history) so you can try everything immediately.

## 3) Backend — Node.js + Express (optional middle layer)

```bash
cd backend
cp .env.example .env        # Supabase keys + GROQ_API_KEY from console.groq.com
npm install
npm run dev                 # http://localhost:4000
```

Routes: `POST /api/auth/register|login`, `GET/POST/PUT/DELETE /api/habits`,
`POST /api/habits/:id/log`, `GET /api/habits/:id/history`, `GET /api/dashboard`,
`POST /api/ai/advice`, `GET /api/ai/weekly-review`. The Groq API key and the
service-role key never leave this server; the AI only receives a small
anonymized summary of completion rates.

## Security notes

- Passwords are handled by Supabase Auth (never stored in plain text anywhere).
- Row Level Security enforces `auth.uid() = user_id` on every table.
- Secrets live only in `.env` files — never commit them.

**Small actions · Consistent progress · Better habits.**
