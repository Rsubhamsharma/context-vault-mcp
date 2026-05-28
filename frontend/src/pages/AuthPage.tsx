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
      <section className="authPanel">
        <h1>Context Vault</h1>
        <p>Shared AI-readable project memory for your tools, MCP clients, and repository changes.</p>
        {error && <ErrorBox message={error} />}
        <form onSubmit={submit} className="form">
          {mode === "signup" && <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button disabled={loading}>{loading ? "Working..." : mode === "login" ? "Login" : "Create account"}</button>
        </form>
        <p className="muted">
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <Link to={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Signup" : "Login"}</Link>
        </p>
      </section>
    </main>
  );
}
