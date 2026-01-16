import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type UserRow = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: string;
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

function roleLower(r: string | null | undefined) {
  return String(r ?? "").toLowerCase();
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Admin() {
  const nav = useNavigate();

  const token = localStorage.getItem("jwt") ?? "";
  const me = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadUsers() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get("/admin/users");
      setItems((res.data ?? []) as UserRow[]);
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (roleLower(me?.role) !== "admin") {
      nav("/dashboard");
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const admins = useMemo(() => items.filter((u) => roleLower(u.role) === "admin"), [items]);
  const users = useMemo(() => items.filter((u) => roleLower(u.role) !== "admin"), [items]);

  async function setRole(userId: string, role: "admin" | "user") {
    setBusyId(userId);
    setMsg(null);
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setMsg({ kind: "ok", text: "Role updated ✅" });
      await loadUsers();
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
      await loadUsers();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  function back() {
    nav("/dashboard");
  }

  function openLoans(userId: string) {
    nav(`/admin/users/${userId}/loans`);
  }

  // ✅ חדש: מעבר למסך בקשות מסגרת
  function openOverdraftRequests() {
    nav("/admin/overdraft");
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
              <div className="brandSub">Manage users, roles & loans</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btnGhost" onClick={loadUsers} type="button">
              Refresh
            </button>

            {/* ✅ חדש */}
            <button className="btnGhost" onClick={openOverdraftRequests} type="button">
              Overdraft requests
            </button>

            <button className="btnGhost" onClick={back} type="button">
              Back
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
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {/* מנהלים */}
              <div>
                <h2 className="sectionTitle" style={{ marginBottom: 10 }}>
                  Managers
                </h2>

                {admins.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {admins.map((u) => {
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
                              Role: <b>admin</b> • Created: {formatDate(u.createdAt)}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button className="btnGhostSmall" disabled={isBusy} onClick={() => openLoans(u.id)} type="button">
                              Loans
                            </button>

                            <button className="btnGhostSmall" disabled={isBusy} onClick={() => setRole(u.id, "user")} type="button">
                              Set user
                            </button>

                            <button className="btnGhostSmall" disabled={isBusy} onClick={() => deleteUser(u.id)} type="button">
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="hint">אין מנהלים כרגע.</div>
                )}
              </div>

              {/* משתמשים */}
              <div>
                <h2 className="sectionTitle" style={{ marginBottom: 10 }}>
                  Users
                </h2>

                {users.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {users.map((u) => {
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
                              Role: <b>{roleLower(u.role) || "user"}</b> • Created: {formatDate(u.createdAt)}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button className="btnGhostSmall" disabled={isBusy} onClick={() => openLoans(u.id)} type="button">
                              Loans
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
                    })}
                  </div>
                ) : (
                  <div className="hint">אין משתמשים כרגע.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}