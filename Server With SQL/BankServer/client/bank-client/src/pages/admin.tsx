import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type UserRow = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: "admin" | "user" | string;
  createdAt?: string;
};

type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Request failed";

  const status = e.response?.status;
  const data: unknown = e.response?.data;

  if (typeof data === "string") return `(${status ?? "?"}) ${data}`;

  if (data && typeof data === "object") {
    if ("message" in data && typeof (data as { message?: unknown }).message === "string") {
      return `(${status ?? "?"}) ${(data as { message: string }).message}`;
    }
  }

  return `Request failed (${status ?? "?"})`;
}

function isAdminRole(role: unknown) {
  return String(role ?? "").toLowerCase() === "admin";
}

export default function Admin() {
  const nav = useNavigate();

  const token = localStorage.getItem("jwt") ?? "";
  const me = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  const [admins, setAdmins] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, uRes] = await Promise.all([api.get("/admin/admins"), api.get("/admin/users")]);

      setAdmins(aRes.data ?? []);
      setUsers(uRes.data ?? []);
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // אם משום מה זה מגיע לפה בלי admin:
    if (!isAdminRole(me?.role)) {
      nav("/dashboard");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // אם בשרת אצלך זה PUT במקום PATCH — תשנה פה ל- put
  async function setRole(userId: string, role: "admin" | "user") {
    setBusyId(userId);
    setMsg(null);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setMsg({ kind: "ok", text: "Role updated ✅" });
      await loadAll();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(userId: string) {
    setBusyId(userId);
    setMsg(null);
    try {
      await api.delete(`/admin/users/${userId}`);
      setMsg({ kind: "ok", text: "User deleted ✅" });
      await loadAll();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  function back() {
    nav("/dashboard");
  }

  function renderRow(u: UserRow) {
    const role = String(u.role ?? "").toLowerCase();
    const isBusy = busyId === u.id;

    return (
      <div
        key={u.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>
            {u.name} <span style={{ opacity: 0.7, fontWeight: 700 }}>({u.userName})</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{u.email}</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Role: <b>{role}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btnGhostSmall" disabled={isBusy} onClick={() => setRole(u.id, "user")} type="button">
            Set user
          </button>
          <button className="btnGhostSmall" disabled={isBusy} onClick={() => setRole(u.id, "admin")} type="button">
            Set admin
          </button>
          <button className="btnGhostSmall" disabled={isBusy} onClick={() => deleteUser(u.id)} type="button">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell wide">
        <div className="topbar">
          <div className="brand">
            <div className="logo">🛡️</div>
            <div>
              <div className="brandTitle">Admin</div>
              <div className="brandSub">Managers first, users below</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btnGhost" onClick={loadAll} type="button">
              Refresh
            </button>
            <button className="btnGhost" onClick={back} type="button">
              Back
            </button>
          </div>
        </div>

        {msg && <div className={`toast ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

        <div className="cardPro">
          <h2 className="sectionTitle">Admins</h2>

          {loading ? (
            <div className="skeletonBox">
              <div className="skeletonLine" />
              <div className="skeletonLine short" />
              <div className="skeletonLine" />
            </div>
          ) : admins.length ? (
            <div style={{ display: "grid", gap: 10 }}>{admins.map(renderRow)}</div>
          ) : (
            <div className="hint">No admins found.</div>
          )}
        </div>

        <div className="cardPro" style={{ marginTop: 16 }}>
          <h2 className="sectionTitle">Users</h2>

          {loading ? (
            <div className="skeletonBox">
              <div className="skeletonLine" />
              <div className="skeletonLine short" />
              <div className="skeletonLine" />
            </div>
          ) : users.length ? (
            <div style={{ display: "grid", gap: 10 }}>{users.map(renderRow)}</div>
          ) : (
            <div className="hint">No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}