import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authStore } from "../api/client";
import { ErrorBox } from "../components/State";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "login"
        ? await api.login({ email, password })
        : await api.signup({ email, password, name: name || undefined });
      authStore.setToken(result.token);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authShell">
      <section className="authContextPanel" aria-label="Context Vault overview">
        <div className="brand"><span className="brandMark"></span>Context Vault</div>
        <h1>Load the same project memory across AI tools.</h1>
        <p>GitHub stores code. Context Vault stores AI-readable project memory for Codex, Cursor, Claude, Windsurf, and MCP-compatible clients.</p>
        <div className="authProofList">
          <span>ProjectContext source of truth</span>
          <span>Review-first suggestions</span>
          <span>Scoped MCP API keys</span>
        </div>
      </section>
      <section className="authPanel">
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p>{mode === "login" ? "Load the same project memory across AI tools." : "Create a vault for portable AI-readable project memory."}</p>
        {error && <ErrorBox message={error} />}
        <form onSubmit={submit} className="form">
          {mode === "signup" && <label>Name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label>Email<input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button disabled={loading}>{loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="muted">
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <Link to={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Signup" : "Login"}</Link>
        </p>
      </section>
    </main>
  );
}
