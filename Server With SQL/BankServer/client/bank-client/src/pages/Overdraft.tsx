import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../api";

type OverdraftStatus = "none" | "pending" | "approved" | "rejected";

type OverdraftMeResponse = {
  accountId: string;
  balance: number;
  overdraftLimit: number;
  remainingBeforeLimit: number;
  request: {
    status: OverdraftStatus;
    requestedLimit: number | null;
    note: string | null;
  };
};

function formatMoney(v: number) {
  if (!Number.isFinite(v)) return String(v);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(v);
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

export default function Overdraft() {
  const nav = useNavigate();

  const [data, setData] = useState<OverdraftMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [reqLimit, setReqLimit] = useState("");
  const [reqNote, setReqNote] = useState("");

  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get("/overdraft/me");
      setData(res.data as OverdraftMeResponse);
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
  }, []);

  const computed = useMemo(() => {
    const d = data;
    if (!d) return null;

    const bal = Number(d.balance);
    const limit = Number(d.overdraftLimit);

    const usedMinus = bal < 0 ? Math.abs(bal) : 0;
    const withinFrame = limit > 0 ? Math.min(usedMinus, limit) : 0;
    const exceeded = limit > 0 ? Math.max(0, usedMinus - limit) : usedMinus > 0 ? usedMinus : 0;
    const pct = limit > 0 ? Math.min(100, (withinFrame / limit) * 100) : 0;

    return { bal, limit, usedMinus, withinFrame, exceeded, pct };
  }, [data]);

  async function requestIncrease() {
    const n = Number(reqLimit);

    if (!Number.isFinite(n) || n <= 0) {
      setMsg({ kind: "err", text: "מסגרת מבוקשת חייבת להיות מספר חיובי" });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      await api.post("/overdraft/me/request", {
        requestedLimit: n,
        note: reqNote.trim() ? reqNote.trim() : undefined,
      });

      setMsg({ kind: "ok", text: "הבקשה נשלחה ✅ מחכה לאישור מנהל" });
      setReqLimit("");
      setReqNote("");
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  // ✅ Back אמיתי: אם יש היסטוריה -> אחורה, אחרת לדשבורד
  function back() {
    // אם אין history (נכנסו ישירות לכתובת), נחזיר לדשבורד
    if (window.history.length <= 1) {
      nav("/dashboard", { replace: true });
      return;
    }
    nav(-1);
  }

  const disableRequest = busy || data?.request.status === "pending";

  return (
    <div className="bg">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="orb orbC" />

      <div className="shell wide">
        <div className="topbar">
          <div className="brand">
            <div className="logo">💳</div>
            <div>
              <div className="brandTitle">Overdraft</div>
              <div className="brandSub">מסגרת עו״ש ובקשות להגדלה</div>
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
          ) : !data || !computed ? (
            <div className="alert">No data.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <div className="chipCard">
                  <div className="chipK">Balance</div>
                  <div className="chipV">{formatMoney(computed.bal)}</div>
                </div>
                <div className="chipCard">
                  <div className="chipK">Overdraft limit</div>
                  <div className="chipV">{formatMoney(computed.limit)}</div>
                </div>
                <div className="chipCard">
                  <div className="chipK">Used (minus)</div>
                  <div className="chipV">{formatMoney(computed.usedMinus)}</div>
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>ניצול מסגרת</div>
                  <div style={{ fontWeight: 800, opacity: 0.9 }}>
                    {computed.limit > 0 ? `${computed.pct.toFixed(0)}%` : "—"}
                  </div>
                </div>

                <div style={{ height: 10 }} />

                <div
                  style={{
                    height: 14,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${computed.pct}%`,
                      background: "rgba(120,255,160,0.45)",
                    }}
                  />
                </div>

                <div style={{ height: 10 }} />

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, opacity: 0.8 }}>
                  <div>Within frame: {formatMoney(computed.withinFrame)}</div>
                  <div>Exceeded: {formatMoney(computed.exceeded)}</div>
                  <div>Remaining before limit: {formatMoney(Number(data.remainingBeforeLimit))}</div>
                </div>

                {computed.exceeded > 0 && (
                  <div style={{ marginTop: 10 }} className="toast err">
                    חריגה מהמסגרת! זה עלול לגרור עמלה חודשית.
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 900 }}>בקשה להגדלת מסגרת</div>

                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  Status: <b>{data.request.status}</b>
                  {data.request.requestedLimit != null && (
                    <>
                      {" "}
                      • Requested: <b>{formatMoney(Number(data.request.requestedLimit))}</b>
                    </>
                  )}
                </div>

                {data.request.note && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Note: {data.request.note}</div>
                )}

                <div style={{ height: 12 }} />

                <div className="label">מסגרת מבוקשת</div>
                <input
                  className="input"
                  value={reqLimit}
                  onChange={(e) => setReqLimit(e.target.value)}
                  placeholder="למשל: 5000"
                  inputMode="decimal"
                  disabled={disableRequest}
                />

                <div className="label">הערה (אופציונלי)</div>
                <input
                  className="input"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  placeholder="למשל: צורך זמני / שדרוג משכורת"
                  disabled={disableRequest}
                />

                <div className="actionRow">
                  <button className="btnPrimary" onClick={requestIncrease} disabled={disableRequest} type="button">
                    {busy ? "שולח..." : data.request.status === "pending" ? "ממתין לאישור" : "שלח בקשה"}
                  </button>

                  <button
                    className="btnGhostSmall"
                    onClick={() => {
                      setReqLimit("");
                      setReqNote("");
                    }}
                    disabled={busy}
                    type="button"
                  >
                    ניקוי
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}