"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in failed");
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return <main className="login-shell">
    <div className="login-aside">
      <div className="brand-mark">AI<span>·</span>IS</div>
      <p className="eyebrow">RESEARCH → ORIGINALITY → EVIDENCE</p>
      <h1>A studio for virtual creators with a point of view.</h1>
      <p className="muted-light">Build a consistent voice, make deliberate creative work, and let measured results shape what comes next.</p>
      <div className="login-note"><span className="status-dot" /> Human approval is on by default</div>
    </div>
    <form className="login-card" onSubmit={submit}>
      <div className="eyebrow">PRIVATE WORKSPACE</div>
      <h2>Welcome back</h2>
      <p>Enter the studio admin password configured on this server.</p>
      <label htmlFor="password">Admin password</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error && <div className="form-error">{error}</div>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Signing in…" : "Enter studio"}</button>
      <small>Access is restricted to one administrator account.</small>
    </form>
  </main>;
}
