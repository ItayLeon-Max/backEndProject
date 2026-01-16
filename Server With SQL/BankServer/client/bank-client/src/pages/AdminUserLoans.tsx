import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type LoanItem = {
  id: string;
  accountId: string;
  principal: number;
  remainingPrincipal: number;
  annualInterestRate: number;
  termMonths: number;
  monthlyPayment: number;
  status: string;
  startDate: string;
  note: string | null;

  isLate: boolean;
  lateCount: number;
  lateSince: string | null;
  nextDueDate: string | null;
  lastPaymentAt: string | null;
};

type AccountRow = {
  id: string;
  accountNumber: string;
  balance: string;
  userId: string;
  createdAt: string;
};

type UserMini = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: string;
};

type OverviewResponse = {
  user: UserMini;
  accounts: AccountRow[];
  delinquentLoans: number;
  loans: LoanItem[];
};

function formatMoney(v: number | string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

function extractErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return "Request failed";

  const status = e.response?.status;
  const data: unknown = e.response?.data;

  if (typeof data === "string") return `(${status ?? "?"}) ${data}`;

  if (data && typeof data === "object") {
    const msg = (data as Record<string, unknown>)["message"];
    if (typeof msg === "string") return `(${status ?? "?"}) ${msg}`;
    return `(${status ?? "?"}) ${JSON.stringify(data)}`;
  }

  return `Request failed (${status ?? "?"})`;
}

export default function AdminUserLoans() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const userId = useMemo(() => (id ?? "").trim(), [id]);

  async function load() {
    if (!userId) {
      setMsg({ kind: "err", text: "Missing user id in route" });
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await api.get(`/admin/users/${userId}/loans`);
      setData(res.data as OverviewResponse);
    } catch (e: unknown) {
      // ✅ חשוב: לא להעיף לדשבורד על כל שגיאה
      // רק אם זו שגיאת auth אמיתית
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;

      if (status === 401) {
        localStorage.removeItem("jwt");
        nav("/", { replace: true });
        return;
      }

      setMsg({ kind: "err", text: extractErrorMessage(e) });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function back() {
    // הכי טבעי: לחזור למסך הקודם (admin)
    nav(-1);
  }

  return (
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell wide">
        <div className="topbar">
          <div className="brand">
            <div className="logo">📄</div>
            <div>
              <div className="brandTitle">User loans</div>
              <div className="brandSub">Admin view</div>
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
          ) : !data ? (
            <div className="alert">No data.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {/* user header */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {data.user.name} <span style={{ opacity: 0.7 }}>({data.user.userName})</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {data.user.email} • role: <b>{String(data.user.role)}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  Delinquent loans: <b>{data.delinquentLoans}</b>
                </div>
              </div>

              {/* accounts */}
              <div>
                <h2 className="sectionTitle" style={{ marginBottom: 10 }}>
                  Accounts
                </h2>

                {data.accounts.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.accounts.map((a) => (
                      <div
                        key={a.id}
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
                          <div style={{ fontWeight: 900 }}>#{a.accountNumber}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>AccountId: {a.id}</div>
                        </div>

                        <div style={{ fontWeight: 900 }}>{formatMoney(a.balance)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hint">No accounts.</div>
                )}
              </div>

              {/* loans */}
              <div>
                <h2 className="sectionTitle" style={{ marginBottom: 10 }}>
                  Loans
                </h2>

                {data.loans.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.loans.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontWeight: 900 }}>Loan #{l.id}</div>
                          <div className={`toast ${l.isLate ? "err" : "ok"}`} style={{ padding: "6px 10px" }}>
                            {l.isLate ? `LATE (${l.lateCount})` : "OK"}
                          </div>
                        </div>

                        <div style={{ height: 8 }} />

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                          <div className="chipCard">
                            <div className="chipK">Principal</div>
                            <div className="chipV">{formatMoney(l.principal)}</div>
                          </div>
                          <div className="chipCard">
                            <div className="chipK">Remaining</div>
                            <div className="chipV">{formatMoney(l.remainingPrincipal)}</div>
                          </div>
                          <div className="chipCard">
                            <div className="chipK">Monthly</div>
                            <div className="chipV">{formatMoney(l.monthlyPayment)}</div>
                          </div>
                        </div>

                        <div style={{ height: 10 }} />

                        <div style={{ fontSize: 12, opacity: 0.85, display: "grid", gap: 4 }}>
                          <div>Rate: {l.annualInterestRate}% • Term: {l.termMonths} months • Status: <b>{l.status}</b></div>
                          <div>Start: {formatDate(l.startDate)}</div>
                          <div>Late since: {formatDate(l.lateSince)} • Next due: {formatDate(l.nextDueDate)} • Last paid: {formatDate(l.lastPaymentAt)}</div>
                          {l.note ? <div>Note: {l.note}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hint">No loans.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}