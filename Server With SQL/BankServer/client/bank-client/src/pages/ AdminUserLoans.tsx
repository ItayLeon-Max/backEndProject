import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type UserInfo = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: string;
};

type Account = {
  id: string;
  accountNumber: string;
  balance: string | number;
  userId: string;
  createdAt?: string;
};

type LoanRow = {
  id: string;
  accountId: string;

  principal: number;
  remainingPrincipal: number;
  annualInterestRate: number;
  termMonths: number;
  monthlyPayment: number;

  status: "pending" | "approved" | "rejected" | "active" | "closed";
  startDate: string | null;
  note: string | null;

  // ✅ מגיע מהשרת
  isLate: boolean;

  // ⬇️ השדות האלה "אופציונליים" כי אצלך יכול להיות שהשרת עדיין לא מחזיר אותם
  lateCount?: number;
  lateSince?: string | null;

  nextDueDate?: string | null;
  lastPaymentAt?: string | null;
};

type OverviewResponse = {
  user: UserInfo;
  accounts: Account[];
  delinquentLoans?: number; // יכול להיות שלא קיים בשרת עדיין
  loans: LoanRow[];
};

function formatMoney(v: string | number) {
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
    const maybe = data as Record<string, unknown>;
    const msg = maybe["message"];
    if (typeof msg === "string") return `(${status ?? "?"}) ${msg}`;
  }

  return `Request failed (${status ?? "?"})`;
}

export default function UserLoans() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>(); // userId

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // --- Late fee UI state ---
  const [feeOpenLoanId, setFeeOpenLoanId] = useState<string | null>(null);
  const [feePercent, setFeePercent] = useState<string>("5");
  const [feeNote, setFeeNote] = useState<string>("");
  const [feeBusy, setFeeBusy] = useState(false);

  const totalBalance = useMemo(() => {
    const accounts = data?.accounts ?? [];
    const sum = accounts.reduce((acc, a) => acc + Number(a.balance ?? 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [data]);

  const delinquentCount = useMemo(() => {
    if (!data) return 0;
    if (typeof data.delinquentLoans === "number") return data.delinquentLoans;
    // fallback אם השרת לא שולח delinquentLoans:
    return (data.loans ?? []).filter((l) => Boolean(l.isLate)).length;
  }, [data]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await api.get(`/admin/users/${id}/loans`);

      // ✅ DEBUG קטן (אפשר להשאיר, זה יעזור לך להבין מה מגיע):
      // eslint-disable-next-line no-console
      console.log("LOANS OVERVIEW:", res.data);
      // eslint-disable-next-line no-console
      console.log("LOANS:", res.data?.loans);

      setData(res.data as OverviewResponse);
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function back() {
    nav("/admin");
  }

  function openFee(loanId: string) {
    setFeeOpenLoanId(loanId);
    setFeePercent("5");
    setFeeNote("");
    setMsg(null);
  }

  function closeFee() {
    setFeeOpenLoanId(null);
    setFeePercent("5");
    setFeeNote("");
  }

  async function submitLateFee(userId: string, loanId: string) {
    const percentNum = Number(feePercent);

    if (!Number.isFinite(percentNum) || percentNum <= 0 || percentNum > 100) {
      setMsg({ kind: "err", text: "אחוז עמלה חייב להיות בין 1 ל-100" });
      return;
    }

    setFeeBusy(true);
    setMsg(null);

    try {
      await api.post(`/admin/users/${userId}/loans/${loanId}/late-fee`, {
        percent: percentNum,
        note: feeNote.trim() ? feeNote.trim() : undefined,
      });

      setMsg({ kind: "ok", text: "עמלת פיגור נגבתה ✅" });
      closeFee();
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setFeeBusy(false);
    }
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
              <div className="brandTitle">User Loans</div>
              <div className="brandSub">{data?.user?.name ?? "—"} • Loans overview</div>
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
            <div style={{ display: "grid", gap: 12 }}>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <div className="chipCard">
                  <div className="chipK">Balance</div>
                  <div className="chipV">{formatMoney(totalBalance)}</div>
                </div>
                <div className="chipCard">
                  <div className="chipK">Loans</div>
                  <div className="chipV">{data.loans.length}</div>
                </div>
                <div className="chipCard">
                  <div className="chipK">Delinquent</div>
                  <div className="chipV">{delinquentCount}</div>
                </div>
              </div>

              {/* Loans list */}
              <div style={{ display: "grid", gap: 10 }}>
                {data.loans.map((l) => {
                  const late = Boolean(l.isLate);
                  const lateCount = typeof l.lateCount === "number" ? l.lateCount : late ? 1 : 0;

                  const pillStyle = late
                    ? {
                        background: "rgba(255,80,80,0.18)",
                        border: "1px solid rgba(255,80,80,0.35)",
                        color: "rgba(255,255,255,0.95)",
                      }
                    : {
                        background: "rgba(120,255,160,0.14)",
                        border: "1px solid rgba(120,255,160,0.28)",
                        color: "rgba(255,255,255,0.92)",
                      };

                  const isFeeOpen = feeOpenLoanId === l.id;

                  return (
                    <div
                      key={l.id}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            Loan{" "}
                            <span className="mono" style={{ fontSize: 12, opacity: 0.8 }}>
                              {l.id}
                            </span>
                            <span style={{ padding: "2px 10px", borderRadius: 999, fontWeight: 900, fontSize: 12, ...pillStyle }}>
                              {late ? `בפיגור (${lateCount})` : "תקין"}
                            </span>
                          </div>

                          <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", opacity: 0.92 }}>
                            <div>
                              <b>Principal:</b> {formatMoney(l.principal)}
                            </div>
                            <div>
                              <b>Monthly:</b> {formatMoney(l.monthlyPayment)}
                            </div>
                            <div>
                              <b>Remaining:</b> {formatMoney(l.remainingPrincipal)}
                            </div>
                            <div>
                              <b>Months:</b> {l.termMonths}
                            </div>
                            <div>
                              <b>APR:</b> {Number.isFinite(l.annualInterestRate) ? `${l.annualInterestRate}%` : "—"}
                            </div>
                            <div>
                              <b>Status:</b> {l.status}
                            </div>
                          </div>

                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div>Start: {formatDate(l.startDate)}</div>
                            <div>Next due: {formatDate(l.nextDueDate)}</div>
                            <div>Last payment: {formatDate(l.lastPaymentAt)}</div>
                            {late && <div>Late since: {formatDate(l.lateSince)}</div>}
                          </div>

                          {l.note ? (
                            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                              <b>Note:</b> {l.note}
                            </div>
                          ) : null}
                        </div>

                        {/* Charge late fee */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                          {late ? (
                            <button className="btnGhostSmall" onClick={() => openFee(l.id)} type="button">
                              Charge late fee
                            </button>
                          ) : (
                            <button className="btnGhostSmall" disabled type="button">
                              Charge late fee
                            </button>
                          )}
                        </div>
                      </div>

                      {isFeeOpen && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(0,0,0,0.18)",
                          }}
                        >
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Late fee</div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, alignItems: "center" }}>
                            <div style={{ opacity: 0.85, fontWeight: 700 }}>Percent</div>
                            <input
                              className="input"
                              value={feePercent}
                              onChange={(e) => setFeePercent(e.target.value)}
                              placeholder="למשל: 5"
                              inputMode="decimal"
                              disabled={feeBusy}
                            />

                            <div style={{ opacity: 0.85, fontWeight: 700 }}>Note</div>
                            <input
                              className="input"
                              value={feeNote}
                              onChange={(e) => setFeeNote(e.target.value)}
                              placeholder="אופציונלי"
                              disabled={feeBusy}
                            />
                          </div>

                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                            <button className="btnGhostSmall" onClick={closeFee} disabled={feeBusy} type="button">
                              Cancel
                            </button>
                            <button
                              className="btnPrimary"
                              onClick={() => submitLateFee(data.user.id, l.id)}
                              disabled={feeBusy}
                              type="button"
                            >
                              {feeBusy ? "Charging..." : "Charge"}
                            </button>
                          </div>

                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                            * העמלה תרד ישירות מהחשבון של ההלוואה דרך השרת
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!data.loans.length && <div className="hint">אין הלוואות למשתמש.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}