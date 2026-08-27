import { useState, type FormEvent } from "react";
import { Icon } from "../components/icons";
import { cloudEnabled, signIn, signUp } from "../lib/supabase";

export function Auth({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) return setErr("Email and password are required.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (mode === "register") {
      if (!name.trim()) return setErr("Please tell us your name.");
      if (password !== confirm) return setErr("Passwords don't match.");
    }
    setBusy(true);
    try {
      if (mode === "register") await signUp(email.trim(), password, name.trim());
      else await signIn(email.trim(), password);
      // onAuthStateChange in App picks the session up
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <span className="tile" style={{ background: "rgba(240,197,104,0.16)", color: "#f0c568", border: "1px solid rgba(240,197,104,0.3)" }}>
            <Icon name="logo" size={22} sw={1.9} />
          </span>
          <b>HabitFlow</b>
        </div>

        <div>
          <h1 className="auth-headline">
            Build better habits.
            <br />
            <em>One day at a time.</em>
          </h1>
          <p className="auth-sub">
            A calm, data-driven tracker for students and busy humans. Plan your habits, keep the streak alive, and let
            the coach turn your data into advice.
          </p>
          <div className="auth-feats">
            {[
              ["check", "One-tap daily check-ins & measurable targets"],
              ["flame", "Streaks that survive real life — skip, don't break"],
              ["spark", "Private AI insights computed from your own history"],
              ["cloud", "Synced to Supabase — your data follows your account"],
            ].map(([ic, txt]) => (
              <div key={txt} className="auth-feat">
                <span className="auth-feat-ic">
                  <Icon name={ic} size={16} />
                </span>
                {txt}
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", zIndex: 2, fontSize: 12, color: "#8fa795", fontWeight: 600 }}>
          Small actions · Consistent progress · Better habits
        </p>

        <svg className="auth-deco" viewBox="0 0 24 24" fill="none" stroke="rgba(240,197,104,0.5)" strokeWidth="0.5">
          <path d="M6 19C6 10.5 12.5 5.5 20 5.5 20 13 15 19.5 6.5 19.5" />
          <path d="M6 19c2.5-5.5 6-9 10.5-11" />
        </svg>
      </div>

      {/* form panel */}
      <div className="auth-form-wrap">
        <div className="auth-card card">
          <div className="auth-mobile-logo">
            <span className="tile" style={{ background: "var(--leaf)", color: "#fff" }}>
              <Icon name="logo" size={20} sw={1.9} />
            </span>
            <b>HabitFlow</b>
          </div>

          <h2 className="h1">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="txt-s muted mt-s mb-m">
            {mode === "login"
              ? "Sign in to pick up your streaks where you left off."
              : "Two minutes to set up. Your future self says thanks."}
          </p>

          {!cloudEnabled && (
            <div className="demo-note mb-m">
              <span className="tile tile-s" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)", flex: "none" }}>
                <Icon name="cloud" size={15} />
              </span>
              <span>
                <b>Cloud sync is off.</b> Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
                <code>frontend/.env</code> (see <code>backend/supabase/schema.sql</code>) to enable real sign-up. For now,
                explore in demo mode — everything runs locally in your browser.
              </span>
            </div>
          )}

          {cloudEnabled && (
            <>
              <div className="tabs mb-m">
                <button type="button" className={`tab-btn ${mode === "login" ? "on" : ""}`} onClick={() => { setMode("login"); setErr(""); }}>
                  Sign in
                </button>
                <button type="button" className={`tab-btn ${mode === "register" ? "on" : ""}`} onClick={() => { setMode("register"); setErr(""); }}>
                  Create account
                </button>
              </div>

              <form className="stack" onSubmit={submit}>
                {mode === "register" && (
                  <div>
                    <label className="label" htmlFor="auth-name">Name</label>
                    <input id="auth-name" className="input" placeholder="Alex Carter" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="auth-email">Email</label>
                  <input id="auth-email" className="input" type="email" placeholder="you@campus.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <label className="label" htmlFor="auth-pass">Password</label>
                  <input id="auth-pass" className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                </div>
                {mode === "register" && (
                  <div>
                    <label className="label" htmlFor="auth-confirm">Confirm password</label>
                    <input id="auth-confirm" className="input" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                  </div>
                )}

                {err && (
                  <p className="form-err">
                    <Icon name="alert" size={15} /> {err}
                  </p>
                )}

                <button className="btn btn-primary w-full" style={{ padding: "12px 16px" }} disabled={busy}>
                  {busy ? <span className="spin" /> : <Icon name={mode === "login" ? "arrowL" : "plus"} size={16} sw={2.2} />}
                  {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="auth-alt mt-m">
                {mode === "login" ? (
                  <>New here? <button type="button" onClick={() => setMode("register")}>Create an account</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setMode("login")}>Sign in</button></>
                )}
              </p>

              <div className="card-foot" style={{ textAlign: "center" }}>
                <button type="button" className="btn btn-ghost btn-s" onClick={onDemo}>
                  <Icon name="spark" size={14} /> or explore the demo (data stays on this device)
                </button>
              </div>
            </>
          )}

          {!cloudEnabled && (
            <button className="btn btn-primary w-full" style={{ padding: "12px 16px" }} onClick={onDemo}>
              <Icon name="spark" size={16} sw={2.2} /> Continue in demo mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
