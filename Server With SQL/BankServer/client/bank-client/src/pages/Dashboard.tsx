import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

import NotificationsPanel, { pushNotification } from "../components/NotificationsPanel";
import AccountTxChart from "../components/AccountTxChart";

type Account = {
  id: string;
  accountNumber: string;
  balance: string | number;
  userId: string;
};

type Tx = {
  id: string;
  type: "deposit" | "withdraw" | "transfer";
  amount: string;
  description?: string | null;
  createdAt: string;

  signedAmount?: number;
  direction?: "in" | "out";

  fromAccountId?: string | null;
  toAccountId?: string | null;
};

type Action = "history" | "deposit" | "withdraw" | "transfer" | "loan";

type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

// --- Overdraft status check (להתראות על אישור/דחייה) ---
type OverdraftStatus = "none" | "pending" | "approved" | "rejected";

type OverdraftMeResponse = {
  request: {
    status: OverdraftStatus;
    requestedLimit: number | null;
    note: string | null;
  };
  overdraftLimit?: number;
};

const OD_STATUS_KEY = "bank_overdraft_status_v1";

function formatMoney(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
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
  const data = e.response?.data;

  if (typeof data === "string") return `(${status ?? "?"}) ${data}`;

  if (data && typeof data === "object") {
    if ("message" in data && typeof (data as { message?: unknown }).message === "string") {
      return `(${status ?? "?"}) ${(data as { message?: string }).message}`;
    }
    if ("errors" in data) {
      return `(${status ?? "?"}) ${JSON.stringify((data as { errors?: unknown }).errors)}`;
    }
    return `(${status ?? "?"}) ${JSON.stringify(data)}`;
  }

  return `Request failed (${status ?? "?"})`;
}

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

function getSignedAmount(tx: Tx, myAccountId: string | null): number {
  if (typeof tx.signedAmount === "number" && Number.isFinite(tx.signedAmount)) return tx.signedAmount;

  const base = Number(tx.amount);
  if (!Number.isFinite(base)) return 0;

  if (!myAccountId) return base;

  if (tx.type === "deposit") return +base;
  if (tx.type === "withdraw") return -base;

  if (tx.type === "transfer") {
    if (tx.fromAccountId && tx.fromAccountId === myAccountId) return -base;
    if (tx.toAccountId && tx.toAccountId === myAccountId) return +base;
  }

  return base;
}

function getBalanceClass(balance: string | number) {
  const n = Number(balance);
  if (!Number.isFinite(n)) return "";
  return n < 0 ? "balance-bad" : "balance-ok";
}

export default function Dashboard() {
  const nav = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [txItems, setTxItems] = useState<Tx[]>([]);
  const [active, setActive] = useState<Action>("history");

  const [amount, setAmount] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [description, setDescription] = useState("");

  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanMonths, setLoanMonths] = useState("12");
  const [loanAnnualRate, setLoanAnnualRate] = useState("8");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const token = localStorage.getItem("jwt") ?? "";
  const me = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  const isAdmin = useMemo(() => {
    const r = (me?.role ?? "").toLowerCase();
    return r === "admin";
  }, [me?.role]);

  async function checkOverdraftStatusForNotifications() {
    try {
      const res = await api.get("/overdraft/me");
      const data = res.data as OverdraftMeResponse;
      const status = data?.request?.status ?? "none";

      const last = (localStorage.getItem(OD_STATUS_KEY) ?? "none") as OverdraftStatus;
      if (status !== last) {
        // שינוי סטטוס -> התראה
        if (status === "approved") {
          pushNotification({
            kind: "ok",
            title: "✅ מסגרת אושרה",
            text: `הבקשה להגדלת מסגרת אושרה. מסגרת חדשה: ${formatMoney(Number(data.overdraftLimit ?? 0))}`,
          });
        } else if (status === "rejected") {
          pushNotification({
            kind: "err",
            title: "❌ מסגרת נדחתה",
            text: "הבקשה להגדלת מסגרת נדחתה.",
          });
        } else if (status === "pending") {
          pushNotification({
            kind: "info",
            title: "⏳ בקשת מסגרת בהמתנה",
            text: "הבקשה נשלחה וממתינה לאישור מנהל.",
          });
        }
      }

      localStorage.setItem(OD_STATUS_KEY, status);
    } catch {
      // לא חובה להפיל את הדשבורד בגלל זה
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        api.get("/accounts/me"),
        api.get("/transactions/me", { params: { page: 1, limit: 30 } }), // ✅ מומלץ יותר מ-8 לגרף
      ]);

      setAccount(accRes.data);
      setTxItems(txRes.data?.items ?? []);

      // ✅ אחרי שיש נתונים, נבדוק סטטוס מסגרת בשביל התראה
      await checkOverdraftStatusForNotifications();
    } catch {
      localStorage.removeItem("jwt");
      nav("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    localStorage.removeItem("jwt");
    nav("/");
  }

  function goSettings() {
    nav("/settings");
  }

  function goAdmin() {
    nav("/admin");
  }

  function goOverdraft() {
    nav("/overdraft");
  }

  function clearForm() {
    setAmount("");
    setToAccountNumber("");
    setDescription("");
  }

  function clearLoanForm() {
    setLoanPrincipal("");
    setLoanMonths("12");
    setLoanAnnualRate("8");
  }

  function setTab(tab: Action) {
    setActive(tab);
    setMsg(null);

    if (tab === "loan") clearForm();
    if (tab !== "loan") clearLoanForm();
    if (tab !== "history" && tab !== "loan") clearForm();
  }

  async function refreshTx() {
    try {
      const txRes = await api.get("/transactions/me", { params: { page: 1, limit: 30 } });
      setTxItems(txRes.data?.items ?? []);
      await checkOverdraftStatusForNotifications();
    } catch {
      setTxItems([]);
    }
  }

  async function submitTx() {
    const n = Number(amount);

    if (!Number.isFinite(n) || n <= 0) {
      setMsg({ kind: "err", text: "סכום חייב להיות מספר חיובי" });
      return;
    }

    if (active === "transfer" && !toAccountNumber.trim()) {
      setMsg({ kind: "err", text: "חסר מספר חשבון יעד" });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      if (active === "deposit") {
        await api.post("/transactions/deposit", { amount: n, description: description || undefined });
        setMsg({ kind: "ok", text: "הפקדה בוצעה ✅" });
        pushNotification({ kind: "ok", title: "הפקדה", text: `${formatMoney(n)} הופקדו לחשבון` });
      } else if (active === "withdraw") {
        await api.post("/transactions/withdraw", { amount: n, description: description || undefined });
        setMsg({ kind: "ok", text: "משיכה בוצעה ✅" });
        pushNotification({ kind: "info", title: "משיכה", text: `${formatMoney(n)} נמשכו מהחשבון` });
      } else if (active === "transfer") {
        await api.post("/transactions/transfer", {
          toAccountNumber: toAccountNumber.trim(),
          amount: n,
          description: description || undefined,
        });
        setMsg({ kind: "ok", text: "העברה בוצעה ✅" });
        pushNotification({ kind: "info", title: "העברה", text: `${formatMoney(n)} הועברו לחשבון ${toAccountNumber.trim()}` });
      }

      await loadAll();
      clearForm();
      setActive("history");
    } catch (e: unknown) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
      pushNotification({ kind: "err", title: "שגיאה", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function submitLoan() {
    const principal = Number(loanPrincipal);
    const months = Number(loanMonths);
    const annualRate = Number(loanAnnualRate);

    if (!Number.isFinite(principal) || principal <= 0) {
      setMsg({ kind: "err", text: "סכום הלוואה חייב להיות חיובי" });
      return;
    }
    if (!Number.isFinite(months) || months < 1 || months > 120) {
      setMsg({ kind: "err", text: "חודשים חייב להיות 1–120" });
      return;
    }
    if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 50) {
      setMsg({ kind: "err", text: "ריבית שנתית חייבת להיות 0–50" });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await api.post("/loans/request", { principal, months, annualRate });
      const monthlyPayment = res.data?.loan?.monthlyPayment;

      setMsg({ kind: "ok", text: `הלוואה אושרה ✅ החזר חודשי: ${formatMoney(monthlyPayment ?? 0)}` });
      pushNotification({
        kind: "ok",
        title: "הלוואה אושרה",
        text: `סכום: ${formatMoney(principal)} • החזר חודשי: ${formatMoney(monthlyPayment ?? 0)}`,
      });

      await loadAll();
      clearLoanForm();
      setActive("history");
    } catch (e: unknown) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
      pushNotification({ kind: "err", title: "שגיאה", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const chartItems = useMemo(() => {
    const myId = account?.id ?? null;
    return txItems.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      signedAmount: getSignedAmount(t, myId),
    }));
  }, [txItems, account?.id]);

  return (
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell wide">
        <div className="topbar">
          <div className="brand">
            <div className="logo">🏦</div>
            <div>
              <div className="brandTitle">Dashboard</div>
              <div className="brandSub">Secure client portal</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {isAdmin && (
              <button className="btnGhost" onClick={goAdmin} type="button">
                Admin
              </button>
            )}

            <button className="btnGhost" onClick={goSettings} type="button">
              Settings
            </button>
            <button className="btnGhost" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* LEFT: main */}
          <div className="cardPro">
            <h2 className="sectionTitle">Account</h2>

            {loading ? (
              <div className="skeletonBox">
                <div className="skeletonLine" />
                <div className="skeletonLine short" />
                <div className="skeletonLine" />
              </div>
            ) : !account ? (
              <div className="alert">No account loaded.</div>
            ) : (
              <div className="accountPanel">
                <div className="kv">
                  <div className="k">Owner</div>
                  <div className="v">{me?.name ?? "—"}</div>
                </div>

                <div className="kv">
                  <div className="k">Account Number</div>
                  <div className="v mono">{account.accountNumber}</div>
                </div>

                <div className="kv">
                  <div className="k">Balance</div>
                  <div className={`v big ${getBalanceClass(account.balance)}`}>{formatMoney(account.balance)}</div>
                </div>

                <div className="actionMenu">
                  <button className={`tabBtn ${active === "history" ? "active" : ""}`} onClick={() => setTab("history")} type="button">
                    תנועות
                  </button>
                  <button className={`tabBtn ${active === "deposit" ? "active" : ""}`} onClick={() => setTab("deposit")} type="button">
                    הפקדה
                  </button>
                  <button className={`tabBtn ${active === "withdraw" ? "active" : ""}`} onClick={() => setTab("withdraw")} type="button">
                    משיכה
                  </button>
                  <button className={`tabBtn ${active === "transfer" ? "active" : ""}`} onClick={() => setTab("transfer")} type="button">
                    העברה
                  </button>
                  <button className={`tabBtn ${active === "loan" ? "active" : ""}`} onClick={() => setTab("loan")} type="button">
                    הלוואה
                  </button>

                  <button className="tabBtn" onClick={goOverdraft} type="button">
                    מסגרת עו״ש
                  </button>
                </div>

                <div className="actionPanel">
                  {msg && <div className={`toast ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

                  {active === "history" && (
                    <>
                      <div className="actionRow">
                        <button className="btnGhostSmall" onClick={refreshTx} type="button">
                          רענון תנועות
                        </button>
                      </div>

                      <div style={{ height: 10 }} />

                      {txItems.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {txItems.map((t) => {
                            const signed = getSignedAmount(t, account?.id ?? null);
                            const sign = signed >= 0 ? "+" : "−";

                            return (
                              <div
                                key={t.id}
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
                                <div>
                                  <div style={{ fontWeight: 800 }}>{t.type.toUpperCase()}</div>
                                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
                                    {formatDate(t.createdAt)}
                                    {t.description ? ` • ${t.description}` : ""}
                                  </div>
                                </div>

                                <div style={{ fontWeight: 900, color: signed < 0 ? "#FF6B6B" : "#7CFF9B" }}>
                                  {sign}
                                  {formatMoney(Math.abs(signed))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="hint">אין תנועות עדיין.</div>
                      )}
                    </>
                  )}

                  {(active === "deposit" || active === "withdraw" || active === "transfer") && (
                    <>
                      {active === "transfer" && (
                        <>
                          <div className="label">מספר חשבון יעד</div>
                          <input
                            className="input"
                            value={toAccountNumber}
                            onChange={(e) => setToAccountNumber(e.target.value)}
                            placeholder="לדוגמה: 57690672"
                          />
                        </>
                      )}

                      <div className="label">סכום</div>
                      <input
                        className="input"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="לדוגמה: 100"
                        inputMode="decimal"
                      />

                      <div className="label">תיאור (אופציונלי)</div>
                      <input
                        className="input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="למשל: ATM"
                      />

                      <div className="actionRow">
                        <button className="btnPrimary" onClick={submitTx} disabled={busy} type="button">
                          {busy ? "מבצע..." : "בצע"}
                        </button>
                        <button className="btnGhostSmall" onClick={clearForm} disabled={busy} type="button">
                          ניקוי
                        </button>
                      </div>
                    </>
                  )}

                  {active === "loan" && (
                    <>
                      <div className="label">סכום הלוואה</div>
                      <input
                        className="input"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(e.target.value)}
                        placeholder="למשל: 5000"
                        inputMode="decimal"
                      />

                      <div className="label">חודשים</div>
                      <input
                        className="input"
                        value={loanMonths}
                        onChange={(e) => setLoanMonths(e.target.value)}
                        placeholder="למשל: 12"
                        inputMode="numeric"
                      />

                      <div className="label">ריבית שנתית (%)</div>
                      <input
                        className="input"
                        value={loanAnnualRate}
                        onChange={(e) => setLoanAnnualRate(e.target.value)}
                        placeholder="למשל: 8"
                        inputMode="decimal"
                      />

                      <div className="actionRow">
                        <button className="btnPrimary" onClick={submitLoan} disabled={busy} type="button">
                          {busy ? "מבצע..." : "בקש הלוואה"}
                        </button>
                        <button className="btnGhostSmall" onClick={clearLoanForm} disabled={busy} type="button">
                          ניקוי
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: notifications + chart */}
          <div style={{ display: "grid", gap: 14 }}>
            <NotificationsPanel />

            <AccountTxChart
              currentBalance={Number(account?.balance ?? 0)}
              items={chartItems}
            />
          </div>
        </div>
      </div>
    </div>
  );
}