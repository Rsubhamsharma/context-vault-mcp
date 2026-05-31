import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, User } from "../api/client";
import { ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

function ProfileDetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const result = await api.me();
        if (!cancelled) setUser(result.user);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="projects-console">
      <header className="console-header pageHeader">
        <div className="console-header-text">
          <h1>Profile</h1>
          <p>Manage your account details for Context Vault.</p>
        </div>
        <div className="console-actions">
          <Link className="ghostButton" to="/projects">Back to Projects</Link>
        </div>
      </header>

      {error && <ErrorBox message={error} />}

      {loading ? <Loading /> : user && (
        <>
          <section>
            <div className="section-title-row">
              <div>
                <h2>Account details</h2>
                <p>Basic details from your authenticated session.</p>
              </div>
            </div>
            <dl className="docsDefinitionTable">
              <ProfileDetailRow label="Name">{user.name?.trim() || "Not provided"}</ProfileDetailRow>
              <ProfileDetailRow label="Email">{user.email}</ProfileDetailRow>
              <ProfileDetailRow label="User ID">{user.id}</ProfileDetailRow>
              {user.createdAt && <ProfileDetailRow label="Created">{formatDate(user.createdAt)}</ProfileDetailRow>}
              <ProfileDetailRow label="Session">Authenticated</ProfileDetailRow>
            </dl>
          </section>

          <section className="apiSecurityNote">
            <p>This account controls dashboard access, project ownership, scoped MCP API keys, and review-first memory suggestions.</p>
          </section>
        </>
      )}
    </section>
  );
}
