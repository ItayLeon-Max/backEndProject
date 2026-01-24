import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { getErrorMessage } from "../api/error";

type UnknownRecord = Record<string, unknown>;
function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}
function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtQty(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "");
  return n.toLocaleString("he-IL", { maximumFractionDigits: 3 });
}

type Warehouse = { id: string; code: string; name: string };
type Item = { id: string; sku: string; name: string };

type OrderStatus = "draft" | "released" | "picked" | "shipped" | "cancelled";

type OrderLine = { id: string; orderId: string; itemId: string; qty: string };
type Reservation = { id: string; orderId: string; warehouseId: string; itemId: string; qtyReserved: string };

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
  lines?: OrderLine[];
  reservations?: Reservation[];
};

function parseWarehouses(data: unknown): Warehouse[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): Warehouse | null => {
      if (!isRecord(row)) return null;
      const id = str(row.id).trim();
      const code = str(row.code).trim();
      const name = str(row.name).trim();
      if (!id || !code || !name) return null;
      return { id, code, name };
    })
    .filter((x): x is Warehouse => x !== null);
}

function parseItems(data: unknown): Item[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): Item | null => {
      if (!isRecord(row)) return null;
      const id = str(row.id).trim();
      const sku = str(row.sku).trim();
      const name = str(row.name).trim();
      if (!id || !sku || !name) return null;
      return { id, sku, name };
    })
    .filter((x): x is Item => x !== null);
}

function parseOrder(data: unknown): Order | null {
  if (!isRecord(data)) return null;
  const id = str(data.id).trim();
  const orderNumber = str(data.orderNumber).trim();
  const status = str(data.status).trim() as OrderStatus;

  if (!id || !orderNumber || !status) return null;

  const linesRaw = data.lines;
  const reservationsRaw = data.reservations;

  const lines: OrderLine[] = Array.isArray(linesRaw)
    ? linesRaw
        .map((r): OrderLine | null => {
          if (!isRecord(r)) return null;
          const lid = str(r.id).trim();
          const orderId = str(r.orderId).trim();
          const itemId = str(r.itemId).trim();
          const qty = str(r.qty).trim();
          if (!lid || !orderId || !itemId) return null;
          return { id: lid, orderId, itemId, qty };
        })
        .filter((x): x is OrderLine => x !== null)
    : [];

  const reservations: Reservation[] = Array.isArray(reservationsRaw)
    ? reservationsRaw
        .map((r): Reservation | null => {
          if (!isRecord(r)) return null;
          const rid = str(r.id).trim();
          const orderId = str(r.orderId).trim();
          const warehouseId = str(r.warehouseId).trim();
          const itemId = str(r.itemId).trim();
          const qtyReserved = str(r.qtyReserved).trim();
          if (!rid || !orderId || !warehouseId || !itemId) return null;
          return { id: rid, orderId, warehouseId, itemId, qtyReserved };
        })
        .filter((x): x is Reservation => x !== null)
    : [];

  return {
    id,
    orderNumber,
    status,
    createdAt: str(data.createdAt || ""),
    updatedAt: str(data.updatedAt || ""),
    lines,
    reservations,
  };
}

function parseOrders(data: unknown): Order[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseOrder).filter((x): x is Order => x !== null);
}

function statusBadge(status: OrderStatus): { label: string; cls: string } {
  switch (status) {
    case "draft":
      return { label: "טיוטה", cls: "badge badge-muted" };
    case "released":
      return { label: "שוחרר (Reserved)", cls: "badge badge-primary" };
    case "picked":
      return { label: "נאסף (Picked)", cls: "badge badge-warning" };
    case "shipped":
      return { label: "נשלח (Shipped)", cls: "badge badge-success" };
    case "cancelled":
      return { label: "בוטל", cls: "badge badge-danger" };
    default:
      return { label: status, cls: "badge badge-muted" };
  }
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // create order
  const [orderNumber, setOrderNumber] = useState<string>("SO-1001");

  // add line
  const [itemQuery, setItemQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState<number>(1);

  // reserve
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  // ship note
  const [shipNote, setShipNote] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedOrder = useMemo(() => orders.find((o) => o.id === selectedOrderId) ?? null, [orders, selectedOrderId]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
  }, [items, itemQuery]);

  const filteredWarehouses = useMemo(() => {
    const q = warehouseQuery.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  }, [warehouses, warehouseQuery]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  async function refreshOrders(selectId?: string) {
    const res = await api.get("/orders");
    const parsed = parseOrders(res.data);
    setOrders(parsed);
    if (selectId) setSelectedOrderId(selectId);
    else if (!selectedOrderId && parsed.length) setSelectedOrderId(parsed[0].id);
  }

  async function loadLists() {
    const [wRes, iRes] = await Promise.all([api.get("/warehouses"), api.get("/items")]);
    setWarehouses(parseWarehouses(wRes.data));
    setItems(parseItems(iRes.data));
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setMsg(null);
      try {
        await Promise.all([loadLists(), refreshOrders()]);
      } catch (e: unknown) {
        if (!alive) return;
        setMsg(getErrorMessage(e));
      } finally {
        if (alive) {
        setLoading(false);
        }
      }
    }

    boot();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrder() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.post("/orders", { orderNumber });
      const created = parseOrder(res.data);
      if (!created) {
        setMsg("השרת החזיר תשובה לא צפויה ביצירת הזמנה.");
        return;
      }
      await refreshOrders(created.id);
      setMsg("✅ הזמנה נוצרה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function addLine() {
    setMsg(null);
    if (!selectedOrderId) {
      setMsg("בחר הזמנה קודם.");
      return;
    }
    if (!itemId) {
      setMsg("בחר מוצר לשורה.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setMsg("כמות חייבת להיות מספר חיובי.");
      return;
    }

    setBusy(true);
    try {
      await api.post(`/orders/${selectedOrderId}/lines`, { itemId, qty });
      await refreshOrders(selectedOrderId);
      setMsg("✅ שורה נוספה להזמנה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function reserve() {
    setMsg(null);
    if (!selectedOrderId) return setMsg("בחר הזמנה קודם.");
    if (!warehouseId) return setMsg("בחר מחסן לשחרור (Reserve).");

    setBusy(true);
    try {
      await api.post(`/orders/${selectedOrderId}/reserve`, { warehouseId });
      await refreshOrders(selectedOrderId);
      setMsg("✅ בוצע Reserve להזמנה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    setMsg(null);
    if (!selectedOrderId) return setMsg("בחר הזמנה קודם.");

    setBusy(true);
    try {
      await api.post(`/orders/${selectedOrderId}/pick`);
      await refreshOrders(selectedOrderId);
      setMsg("✅ ההזמנה עברה ל־Picked.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function ship() {
    setMsg(null);
    if (!selectedOrderId) return setMsg("בחר הזמנה קודם.");

    setBusy(true);
    try {
      await api.post(`/orders/${selectedOrderId}/ship`, { note: shipNote || null });
      await refreshOrders(selectedOrderId);
      setMsg("✅ ההזמנה נשלחה (Ship).");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setMsg(null);
    if (!selectedOrderId) return setMsg("בחר הזמנה קודם.");

    setBusy(true);
    try {
      await api.post(`/orders/${selectedOrderId}/cancel`);
      await refreshOrders(selectedOrderId);
      setMsg("✅ ההזמנה בוטלה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const selectedStatus = selectedOrder?.status ?? "draft";
  const badge = statusBadge(selectedStatus);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>הזמנות</h2>
          <div style={{ opacity: 0.75, marginTop: 4, fontSize: 14 }}>
            תהליך: יצירה → שורות → Reserve → Pick → Ship (עם Idempotency)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className={badge.cls}>{badge.label}</span>
          <button className="btn" onClick={() => refreshOrders(selectedOrderId)} disabled={busy || loading}>
            רענן
          </button>
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,107,107,0.35)",
            background: "rgba(255,107,107,0.12)",
            fontWeight: 800,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 }}>
        {/* Left: Orders list */}
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>רשימת הזמנות</div>

          {loading ? (
            <div style={{ opacity: 0.75 }}>טוען...</div>
          ) : orders.length === 0 ? (
            <div style={{ opacity: 0.75 }}>אין הזמנות עדיין.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: "inherit",
                  outline: "none",
                }}
              >
                <option value="">בחר הזמנה</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.status}
                  </option>
                ))}
              </select>

              {selectedOrder && (
                <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                  <div>
                    <b>OrderNumber:</b> {selectedOrder.orderNumber}
                  </div>
                  <div>
                    <b>Status:</b> {selectedOrder.status}
                  </div>
                  <div style={{ wordBreak: "break-all" }}>
                    <b>ID:</b> {selectedOrder.id}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "grid", gap: 12 }}>
          {/* Create */}
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>יצירת הזמנה</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto" }}>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="למשל: SO-1001"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: "inherit",
                  outline: "none",
                }}
              />
              <button className="btn btn-primary" onClick={createOrder} disabled={busy}>
                צור
              </button>
            </div>
          </div>

          {/* Lines */}
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>שורות להזמנה</div>
                <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>מוסיפים שורות רק כאשר ההזמנה ב־draft</div>
              </div>
              <button className="btn" onClick={addLine} disabled={busy || !selectedOrderId}>
                הוסף שורה
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
              <div>
                <input
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="חיפוש מוצר לפי שם/SKU"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "inherit",
                    outline: "none",
                  }}
                />
                <div style={{ marginTop: 10 }}>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.18)",
                      color: "inherit",
                      outline: "none",
                    }}
                  >
                    <option value="">בחר מוצר</option>
                    {filteredItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>כמות</div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(toNumber(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: "right", opacity: 0.8 }}>
                    <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מוצר</th>
                    <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>כמות</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedOrder?.lines?.length ? (
                    <tr>
                      <td colSpan={2} style={{ padding: 14, opacity: 0.75 }}>
                        אין שורות עדיין.
                      </td>
                    </tr>
                  ) : (
                    selectedOrder.lines.map((l) => {
                      const it = itemById.get(l.itemId);
                      return (
                        <tr key={l.id}>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {it ? `${it.name} (${it.sku})` : l.itemId}
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                            {fmtQty(l.qty)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Process */}
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>תהליך (Reserve → Pick → Ship)</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>מחסן ל־Reserve</div>
                <input
                  value={warehouseQuery}
                  onChange={(e) => setWarehouseQuery(e.target.value)}
                  placeholder="חיפוש מחסן לפי שם/קוד"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "inherit",
                    outline: "none",
                  }}
                />
                <div style={{ marginTop: 10 }}>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.18)",
                      color: "inherit",
                      outline: "none",
                    }}
                  >
                    <option value="">בחר מחסן</option>
                    {filteredWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>הערה ל־Ship (אופציונלי)</div>
                <input
                  value={shipNote}
                  onChange={(e) => setShipNote(e.target.value)}
                  placeholder="למשל: נמסר לשליח"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn btn-primary" onClick={reserve} disabled={busy || !selectedOrderId}>
                Reserve
              </button>
              <button className="btn btn-success" onClick={pick} disabled={busy || !selectedOrderId}>
                Pick
              </button>
              <button className="btn btn-success" onClick={ship} disabled={busy || !selectedOrderId}>
                Ship
              </button>
              <button className="btn btn-danger" onClick={cancel} disabled={busy || !selectedOrderId}>
                Cancel
              </button>
            </div>

            {/* Reservations table */}
            <div style={{ marginTop: 14, overflow: "auto" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Reservations</div>

              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: "right", opacity: 0.8 }}>
                    <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מחסן</th>
                    <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מוצר</th>
                    <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Qty Reserved</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedOrder?.reservations?.length ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                        אין Reservations כרגע.
                      </td>
                    </tr>
                  ) : (
                    selectedOrder.reservations.map((r) => {
                      const w = warehouseById.get(r.warehouseId);
                      const it = itemById.get(r.itemId);
                      return (
                        <tr key={r.id}>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {w ? `${w.name} (${w.code})` : r.warehouseId}
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {it ? `${it.name} (${it.sku})` : r.itemId}
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                            {fmtQty(r.qtyReserved)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* tiny badges styles (optional inline, but better in index.css - leaving here minimal) */}
      <style>
        {`
          .badge{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);font-weight:900;font-size:12px}
          .badge-muted{background:rgba(255,255,255,0.08)}
          .badge-primary{background:rgba(90,170,255,0.18);border-color:rgba(90,170,255,0.35)}
          .badge-warning{background:rgba(255,214,102,0.18);border-color:rgba(255,214,102,0.35)}
          .badge-success{background:rgba(124,255,155,0.16);border-color:rgba(124,255,155,0.30)}
          .badge-danger{background:rgba(255,107,107,0.16);border-color:rgba(255,107,107,0.32)}
        `}
      </style>
    </div>
  );
}