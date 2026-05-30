import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, authStore } from "../api/client";
import { ErrorBox } from "../components/State";

function AuthLogo() {
  return (
    <Link to="/" className="authLogo" aria-label="Context Vault home">
      <span aria-hidden="true"><i /></span>
      <strong>Context Vault</strong>
    </Link>
  );
}

function AuthSidePanel() {
  return (
    <aside className="authValuePanel" aria-label="Context Vault overview">
      <AuthLogo />
      <div>
        <h2>Project memory that survives the tool switch.</h2>
        <p>GitHub stores your code. Context Vault stores your project understanding.</p>
      </div>
      <ul>
        <li><span />Review-first memory</li>
        <li><span />MCP-ready context</li>
        <li><span />GitHub App suggestions</li>
        <li><span />Versioned project memory</li>
      </ul>
    </aside>
  );
}

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const searchReason = new URLSearchParams(location.search).get("reason");
  const [error, setError] = useState(searchReason === "session" ? "Your session expired. Please sign in again." : "");
  const [loading, setLoading] = useState(false);

  const redirectTo = (() => {
    const state = location.state as { from?: { pathname?: string; search?: string } } | null;
    const pathname = state?.from?.pathname;
    if (!pathname || pathname === "/login" || pathname === "/signup") {
      return "/projects";
    }
    return `${pathname}${state?.from?.search ?? ""}`;
  })();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "login"
        ? await api.login({ email, password })
        : await api.signup({ email, password, name: name || undefined });
      authStore.setToken(result.token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authShell">
      <AuthSidePanel />
      <section className="authPanel">
        <div className="authMobileBrand">
          <AuthLogo />
        </div>
        <div className="authPanelContent">
          <h1>{mode === "login" ? "Welcome back" : "Create your vault"}</h1>
          <p>{mode === "login" ? "Load your project memory and continue from the same source of truth." : "Start preserving AI-readable project memory across tools."}</p>
          {error && <ErrorBox message={error} />}
          <form onSubmit={submit} className="authForm">
            {mode === "signup" && <label>Name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>}
            <label>Email<input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <button className="actionButton" disabled={loading} type="submit">{loading ? (mode === "login" ? "Signing in..." : "Creating...") : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="authHelperText">
            {mode === "login" ? "GitHub stores your code. Context Vault stores your project understanding." : "After signup, create a project, generate an API key, and connect MCP."}
          </p>
          <p className="authSwitchLink">
            {mode === "login" ? "Need an account? " : "Already have an account? "}
            <Link to={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create one" : "Sign in"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
