import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { getErrorMessage } from "../api/error";
import type { Item, Warehouse, StockBalance } from "../types/models";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}
function bool(v: unknown): boolean {
  return typeof v === "boolean" ? v : Boolean(v);
}
function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseItems(data: unknown): Item[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): Item | null => {
      if (!isRecord(row)) return null;
      const id = str(row.id).trim();
      const sku = str(row.sku).trim();
      const name = str(row.name).trim();
      const unit = str(row.unit).trim();
      const isActive = bool(row.isActive);

      if (!id || !sku || !name || !unit) return null;
      return { id, sku, name, unit, isActive };
    })
    .filter((x): x is Item => x !== null);
}

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

function parseBalances(data: unknown): StockBalance[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): StockBalance | null => {
      if (!isRecord(row)) return null;
      const warehouseId = str(row.warehouseId).trim();
      const itemId = str(row.itemId).trim();
      const onHand = str(row.onHand ?? "0.000");
      const reserved = str(row.reserved ?? "0.000");
      if (!warehouseId || !itemId) return null;
      return { warehouseId, itemId, onHand, reserved };
    })
    .filter((x): x is StockBalance => x !== null);
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // create
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("EA");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newWarehouseId, setNewWarehouseId] = useState<string>(""); // אופציונלי
  const [newInitialQty, setNewInitialQty] = useState<string>(""); // אופציונלי

  // search
  const [q, setQ] = useState("");

  // edit modal-like
  const [editing, setEditing] = useState<Item | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("EA");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editWarehouseId, setEditWarehouseId] = useState<string>(""); // אופציונלי
  const [editInitialQty, setEditInitialQty] = useState<string>(""); // אופציונלי

  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  // itemId -> list of warehouseIds (לפי balances)
  const warehousesByItemId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of balances) {
      const arr = map.get(b.itemId) ?? [];
      if (!arr.includes(b.warehouseId)) arr.push(b.warehouseId);
      map.set(b.itemId, arr);
    }
    return map;
  }, [balances]);

  async function refreshAll() {
    const [itemsRes, whRes] = await Promise.all([api.get("/items"), api.get("/warehouses")]);

    setItems(parseItems(itemsRes.data));
    setWarehouses(parseWarehouses(whRes.data));

    // balances זה nice-to-have
    try {
      const balRes = await api.get("/inventory/balances");
      setBalances(parseBalances(balRes.data));
    } catch {
      setBalances([]);
    }
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setMsg(null);
      try {
        await refreshAll();
      } catch (e: unknown) {
        if (alive) setMsg(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void boot();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(s) ||
        it.sku.toLowerCase().includes(s) ||
        it.unit.toLowerCase().includes(s)
    );
  }, [items, q]);

  async function createItem() {
    setMsg(null);

    const sku = newSku.trim();
    const name = newName.trim();
    const unit = newUnit.trim();

    if (!sku || !name || !unit) {
      setMsg("SKU / שם / Unit הם חובה.");
      return;
    }

    const initialQty = numOrNull(newInitialQty);

    setBusy(true);
    try {
      await api.post("/items", {
        sku,
        name,
        unit,
        isActive: newIsActive,
        warehouseId: newWarehouseId || null, // אופציונלי
        initialQty: newWarehouseId ? initialQty : null, // ✅ רק אם נבחר מחסן
      });

      setNewSku("");
      setNewName("");
      setNewUnit("EA");
      setNewIsActive(true);
      setNewWarehouseId("");
      setNewInitialQty("");

      await refreshAll();
      setMsg("✅ מוצר נוסף.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(it: Item) {
    setEditing(it);
    setEditSku(it.sku);
    setEditName(it.name);
    setEditUnit(it.unit);
    setEditIsActive(it.isActive);

    setEditWarehouseId(""); // פעולה אופציונלית
    setEditInitialQty("");  // אופציונלי
    setMsg(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditSku("");
    setEditName("");
    setEditUnit("EA");
    setEditIsActive(true);
    setEditWarehouseId("");
    setEditInitialQty("");
  }

  async function saveEdit() {
    if (!editing) return;

    setMsg(null);
    const sku = editSku.trim();
    const name = editName.trim();
    const unit = editUnit.trim();

    if (!sku || !name || !unit) {
      setMsg("SKU / שם / Unit הם חובה.");
      return;
    }

    const initialQty = numOrNull(editInitialQty);

    setBusy(true);
    try {
      await api.put(`/items/${editing.id}`, {
        sku,
        name,
        unit,
        isActive: editIsActive,
        warehouseId: editWarehouseId || null, // אופציונלי
        initialQty: editWarehouseId ? initialQty : null, // ✅ רק אם בחר מחסן
      });

      await refreshAll();
      setMsg("✅ עודכן.");
      closeEdit();
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(it: Item) {
    setMsg(null);
    const ok = window.confirm(`למחוק את "${it.name}"?`);
    if (!ok) return;

    setBusy(true);
    try {
      await api.delete(`/items/${it.id}`);
      await refreshAll();
      setMsg("✅ נמחק.");
      if (editing?.id === it.id) closeEdit();
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function renderWarehousesForItem(itemId: string): string {
    const ids = warehousesByItemId.get(itemId) ?? [];
    if (!ids.length) return "—";
    return ids
      .map((id) => {
        const w = warehouseById.get(id);
        return w ? `${w.name} (${w.code})` : id;
      })
      .join(", ");
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>מוצרים</h2>
          <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>
            צפייה • הוספה • עריכה • מחיקה • שיוך אופציונלי למחסן + מלאי התחלתי (אופציונלי)
          </div>
        </div>

        <button className="btn" onClick={() => refreshAll()} disabled={busy || loading}>
          רענן
        </button>
      </div>

      {msg && <div className="alert">{msg}</div>}

      {/* Create */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>הוספת מוצר</div>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 110px 130px", gap: 10 }}>
          <input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="SKU" className="input" />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="שם מוצר" className="input" />
          <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit" className="input" />
          <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
            <input type="checkbox" checked={newIsActive} onChange={(e) => setNewIsActive(e.target.checked)} />
            פעיל
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 10, alignItems: "center" }}>
          <select className="input" value={newWarehouseId} onChange={(e) => setNewWarehouseId(e.target.value)}>
            <option value="">(אופציונלי) הוסף למחסן...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="כמות התחלתית (אופציונלי)"
            value={newInitialQty}
            onChange={(e) => setNewInitialQty(e.target.value)}
            disabled={!newWarehouseId}
            title={!newWarehouseId ? "כדי להזין כמות, קודם בחר מחסן" : ""}
          />

          <button className="btn btn-primary" onClick={createItem} disabled={busy}>
            הוסף
          </button>
        </div>

        {!newWarehouseId && (
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            טיפ: אם לא בוחרים מחסן, המוצר ייווצר בלי StockBalance. תמיד אפשר לשייך למחסן בעריכה.
          </div>
        )}
      </div>

      {/* Search + table */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>רשימת מוצרים</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי שם / SKU / Unit"
            className="input"
            style={{ maxWidth: 360 }}
          />
        </div>

        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "right", opacity: 0.85 }}>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>SKU</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>שם</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Unit</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מחסנים</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)", width: 240 }}></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>
                    טוען...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>
                    אין מוצרים.
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>{it.sku}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{it.name}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{it.unit}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: 0.9 }}>
                      {renderWarehousesForItem(it.id)}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => startEdit(it)} disabled={busy}>
                          ערוך
                        </button>
                        <button className="btn btn-danger" onClick={() => removeItem(it)} disabled={busy}>
                          מחק
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          אם “מחסנים” תמיד מציג —, כנראה שאין endpoint של <b>/inventory/balances</b> או שאין עדיין StockBalance במערכת.
        </div>
      </div>

      {/* Edit overlay */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div className="card" style={{ width: "min(820px, 96vw)", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>עריכת מוצר</div>
              <button className="btn" onClick={closeEdit} disabled={busy}>
                סגור
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 120px 140px", gap: 10 }}>
              <input value={editSku} onChange={(e) => setEditSku(e.target.value)} className="input" placeholder="SKU" />
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" placeholder="שם" />
              <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="input" placeholder="Unit" />
              <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                פעיל
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 10, alignItems: "center" }}>
              <select className="input" value={editWarehouseId} onChange={(e) => setEditWarehouseId(e.target.value)}>
                <option value="">(אופציונלי) הוסף/עדכן מחסן...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>

              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="מלאי התחלתי (אופציונלי)"
                value={editInitialQty}
                onChange={(e) => setEditInitialQty(e.target.value)}
                disabled={!editWarehouseId}
                title={!editWarehouseId ? "כדי להזין כמות, קודם בחר מחסן" : ""}
              />

              <button className="btn btn-primary" onClick={saveEdit} disabled={busy}>
                שמור
              </button>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              אם בחרת מחסן והזנת כמות — נשמור/נעדכן את <b>onHand</b>.  
              אם בחרת מחסן בלי כמות — רק “נוסיף למחסן” (StockBalance עם 0).
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn" onClick={closeEdit} disabled={busy}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}