import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api";

type OverdraftStatus = "none" | "pending" | "approved" | "rejected";

type AdminOverdraftItem = {
  accountId: string;
  accountNumber: string;
  userId: string;
  user: {
    id: string;
    name: string;
    userName: string;
    email: string;
    role: string;
  } | null;

  overdraftLimit: number;
  requestedLimit: number | null;
  requestStatus: OverdraftStatus;
  requestNote: string | null;

  balance: number;
  updatedAt: string;
};

function formatMoney(v: number) {
  if (!Number.isFinite(v)) return String(v);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(v);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Request failed";
  const status = e.response?.status;
  const data = e.response?.data as unknown;

  if (typeof data === "string") return `(${status ?? "?"}) ${data}`;
  if (data && typeof data === "object") {
    const msg = (data as Record<string, unknown>)["message"];
    if (typeof msg === "string") return `(${status ?? "?"}) ${msg}`;
  }
  return `Request failed (${status ?? "?"})`;
}

export default function AdminOverdraftRequests() {
  const nav = useNavigate();

  const [items, setItems] = useState<AdminOverdraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [noteByAccount, setNoteByAccount] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get("/admin/overdraft/requests");
      setItems((res.data ?? []) as AdminOverdraftItem[]);
    } catch (e) {
      const text = extractErrorMessage(e);
      setMsg({ kind: "err", text });

      // אם זה 401/403 – נחזיר לדשבורד (לא מוחקים JWT אוטומטית)
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        nav("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () => items.filter((x) => x.requestStatus === "pending" && x.requestedLimit != null).length,
    [items]
  );

  async function approve(accountId: string) {
    const note = (noteByAccount[accountId] ?? "").trim();

    setBusyId(accountId);
    setMsg(null);
    try {
      await api.post(`/admin/overdraft/requests/${accountId}/approve`, note ? { note } : {});
      setMsg({ kind: "ok", text: "Approved ✅" });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  async function reject(accountId: string) {
    const note = (noteByAccount[accountId] ?? "").trim();

    setBusyId(accountId);
    setMsg(null);
    try {
      await api.post(`/admin/overdraft/requests/${accountId}/reject`, note ? { note } : {});
      setMsg({ kind: "ok", text: "Rejected ❌" });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  function back() {
    nav("/admin");
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
              <div className="brandTitle">Admin • Overdraft</div>
              <div className="brandSub">Pending requests: {pendingCount}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btnGhost" onClick={load} type="button">
              Refresh
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
          ) : items.length === 0 ? (
            <div className="hint">אין כרגע בקשות מסגרת בהמתנה.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => {
                const isBusy = busyId === it.accountId;
                const isPending = it.requestStatus === "pending" && it.requestedLimit != null;

                return (
                  <div
                    key={it.accountId}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {it.user?.name ?? "Unknown User"}{" "}
                          <span style={{ opacity: 0.7, fontWeight: 700 }}>({it.user?.userName ?? "—"})</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                          {it.user?.email ?? "—"} • Acc #{it.accountNumber} • Updated {formatDate(it.updatedAt)}
                        </div>
                      </div>

                      <div style={{ fontWeight: 900, textAlign: "right" }}>
                        <div>Balance: {formatMoney(it.balance)}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          Current limit: {formatMoney(it.overdraftLimit)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.9 }}>
                      <div>
                        Status: <b>{it.requestStatus}</b>
                      </div>
                      <div>
                        Requested: <b>{it.requestedLimit == null ? "—" : formatMoney(it.requestedLimit)}</b>
                      </div>
                      {it.requestNote ? (
                        <div>
                          Note: <b>{it.requestNote}</b>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div className="label">Admin note (optional)</div>
                      <input
                        className="input"
                        value={noteByAccount[it.accountId] ?? ""}
                        onChange={(e) =>
                          setNoteByAccount((prev) => ({ ...prev, [it.accountId]: e.target.value }))
                        }
                        placeholder="למשל: אושר לשנה / חסר מסמכים"
                        disabled={isBusy}
                      />
                    </div>

                    <div className="actionRow">
                      <button
                        className="btnPrimary"
                        onClick={() => approve(it.accountId)}
                        disabled={!isPending || isBusy}
                        type="button"
                      >
                        {isBusy ? "..." : "Approve"}
                      </button>

                      <button
                        className="btnGhostSmall"
                        onClick={() => reject(it.accountId)}
                        disabled={!isPending || isBusy}
                        type="button"
                      >
                        {isBusy ? "..." : "Reject"}
                      </button>
                    </div>

                    {!isPending && (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        הבקשה כבר לא במצב pending (או שאין requestedLimit).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}