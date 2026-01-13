import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type Me = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: string;
};

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Request failed";
  const status = e.response?.status;
  const data = e.response?.data;

  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === "string") return `(${status ?? "?"}) ${m}`;
  }
  return `Request failed (${status ?? "?"})`;
}

export default function Settings() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadMe() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await api.get("/users/me");
      const u = res.data as Me;

      setMe(u);
      setName(u.name ?? "");
      setUsername(u.userName ?? "");
      setEmail(u.email ?? "");
    } catch {
      localStorage.removeItem("jwt");
      nav("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    setBusy(true);
    setMsg(null);

    try {
      const res = await api.put("/users/me", {
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
      });

      const jwt = (res.data as { jwt?: string }).jwt;
      if (jwt) localStorage.setItem("jwt", jwt);

      setMsg({ kind: "ok", text: "Profile updated ✅" });
      await loadMe();
    } catch (e: unknown) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setMsg({ kind: "err", text: "חסר currentPassword או newPassword" });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      await api.post("/users/me/password", {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setMsg({ kind: "ok", text: "Password updated ✅" });
    } catch (e: unknown) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  function back() {
    nav("/dashboard");
  }

  function logout() {
    localStorage.removeItem("jwt");
    nav("/");
  }

  return (
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell wide">
        <div className="topbar">
          <div className="brand">
            <div className="logo">⚙️</div>
            <div>
              <div className="brandTitle">Settings</div>
              <div className="brandSub">Edit profile & password</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btnGhost" onClick={back} type="button">
              Back
            </button>
            <button className="btnGhost" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <div className="cardPro">
          {msg && <div className={`toast ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

          {loading ? (
            <div className="skeletonBox">
              <div className="skeletonLine" />
              <div className="skeletonLine short" />
              <div className="skeletonLine" />
            </div>
          ) : !me ? (
            <div className="alert">No user loaded.</div>
          ) : (
            <div className="grid">
              <div className="cardPro">
                <h2 className="sectionTitle">Profile</h2>

                <div className="label">Name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

                <div className="label">Username</div>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />

                <div className="label">Email</div>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

                <div className="actionRow">
                  <button className="btnPrimary" onClick={saveProfile} disabled={busy} type="button">
                    {busy ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="hint">Role: {me.role}</div>
              </div>

              <div className="cardPro">
                <h2 className="sectionTitle">Change password</h2>

                <div className="label">Current password</div>
                <input
                  className="input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />

                <div className="label">New password</div>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <div className="actionRow">
                  <button className="btnPrimary" onClick={changePassword} disabled={busy} type="button">
                    {busy ? "Updating..." : "Update password"}
                  </button>
                </div>

                <div className="hint">אחרי שינוי סיסמה אפשר להתחבר מחדש אם צריך.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}