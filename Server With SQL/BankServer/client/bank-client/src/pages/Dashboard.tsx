import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

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
};

type Action = "history" | "deposit" | "withdraw" | "transfer";

type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

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
  const data = e.response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return e.message || "Request failed";
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

export default function Dashboard() {
  const nav = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [txItems, setTxItems] = useState<Tx[]>([]);
  const [active, setActive] = useState<Action>("history");

  const [amount, setAmount] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const token = localStorage.getItem("jwt") ?? "";
  const me = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  async function loadAll() {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        api.get("/accounts/me"),
        api.get("/transactions/me", { params: { page: 1, limit: 8 } }),
      ]);
      setAccount(accRes.data);
      setTxItems(txRes.data?.items ?? []);
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

  function clearForm() {
    setAmount("");
    setToAccountNumber("");
    setDescription("");
  }

  function setTab(tab: Action) {
    setActive(tab);
    setMsg(null);
    if (tab !== "history") clearForm();
  }

  async function refreshTx() {
    try {
      const txRes = await api.get("/transactions/me", { params: { page: 1, limit: 8 } });
      setTxItems(txRes.data?.items ?? []);
    } catch {
      setTxItems([]);
    }
  }

  async function submit() {
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
      } else if (active === "withdraw") {
        await api.post("/transactions/withdraw", { amount: n, description: description || undefined });
        setMsg({ kind: "ok", text: "משיכה בוצעה ✅" });
      } else if (active === "transfer") {
        await api.post("/transactions/transfer", {
          toAccountNumber: toAccountNumber.trim(),
          amount: n,
          description: description || undefined,
        });
        setMsg({ kind: "ok", text: "העברה בוצעה ✅" });
      }

      await loadAll();
      clearForm();
      setActive("history");
    } catch (e: unknown) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
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
            <div className="logo">🏦</div>
            <div>
              <div className="brandTitle">Dashboard</div>
              <div className="brandSub">Secure client portal</div>
            </div>
          </div>

          <button className="btnGhost" onClick={logout}>
            Logout
          </button>
        </div>

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
                <div className="v big">{formatMoney(account.balance)}</div>
              </div>

              {/* menu buttons */}
              <div className="actionMenu">
                <button className={`tabBtn ${active === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
                  תנועות
                </button>
                <button className={`tabBtn ${active === "deposit" ? "active" : ""}`} onClick={() => setTab("deposit")}>
                  הפקדה
                </button>
                <button className={`tabBtn ${active === "withdraw" ? "active" : ""}`} onClick={() => setTab("withdraw")}>
                  משיכה
                </button>
                <button className={`tabBtn ${active === "transfer" ? "active" : ""}`} onClick={() => setTab("transfer")}>
                  העברה
                </button>
              </div>

              {/* content */}
              <div className="actionPanel">
                {msg && <div className={`toast ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

                {active === "history" && (
                  <>
                    <div className="actionRow">
                      <button className="btnGhostSmall" onClick={refreshTx}>
                        רענון תנועות
                      </button>
                    </div>

                    <div style={{ height: 10 }} />

                    {txItems.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {txItems.map((t) => (
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
                            <div style={{ fontWeight: 800 }}>{formatMoney(t.amount)}</div>
                          </div>
                        ))}
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
                      <button className="btnPrimary" onClick={submit} disabled={busy}>
                        {busy ? "מבצע..." : "בצע"}
                      </button>
                      <button className="btnGhostSmall" onClick={clearForm} disabled={busy} type="button">
                        ניקוי
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}