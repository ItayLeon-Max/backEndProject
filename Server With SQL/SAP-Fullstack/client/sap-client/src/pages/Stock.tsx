import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import type { StockBalance, Warehouse, Item } from "../types/models";
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

function parseWarehouses(data: unknown): Warehouse[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row): Warehouse | null => {
      if (!isRecord(row)) return null;
      const id = str(row.id).trim();
      const code = str(row.code).trim();
      const name = str(row.name).trim();
      if (!id || !code || !name) return null;
      return { id, code, name } as Warehouse;
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
      return { id, sku, name } as Item;
    })
    .filter((x): x is Item => x !== null);
}

function parseStockBalance(data: unknown): StockBalance | null {
  if (!isRecord(data)) return null;

  const warehouseId = str(data.warehouseId).trim();
  const itemId = str(data.itemId).trim();
  if (!warehouseId || !itemId) return null;

  const onHand = str(data.onHand ?? "0.000");
  const reserved = str(data.reserved ?? "0.000");

  return { warehouseId, itemId, onHand, reserved } as StockBalance;
}

export default function Stock() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // חיפוש לפי שם
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");

  // בחירה בפועל -> id
  const [warehouseId, setWarehouseId] = useState("");
  const [itemId, setItemId] = useState("");

  const [data, setData] = useState<StockBalance | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadLists() {
      setLoadingLists(true);
      setMsg(null);

      try {
        // אם אצלך items יושב על נתיב אחר - עדכן כאן
        const [wRes, iRes] = await Promise.all([api.get("/warehouses"), api.get("/items")]);

        if (!alive) return;

        setWarehouses(parseWarehouses(wRes.data));
        setItems(parseItems(iRes.data));
      } catch (e: unknown) {
        if (!alive) return;
        setMsg(getErrorMessage(e));
      } finally {
        if (alive) {
        setLoadingLists(false);
        }
      }
    }

    loadLists();
    return () => {
      alive = false;
    };
  }, []);

  const filteredWarehouses = useMemo(() => {
    const q = warehouseQuery.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  }, [warehouses, warehouseQuery]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
  }, [items, itemQuery]);

  const selectedWarehouse = useMemo(() => warehouses.find((w) => w.id === warehouseId) ?? null, [warehouses, warehouseId]);
  const selectedItem = useMemo(() => items.find((it) => it.id === itemId) ?? null, [items, itemId]);

  async function loadStock() {
    setMsg(null);
    setData(null);

    if (!warehouseId || !itemId) {
      setMsg("בחר מחסן ומוצר ואז לחץ “בדוק מלאי”.");
      return;
    }

    setLoadingStock(true);
    try {
      const res = await api.get("/inventory/stock", { params: { warehouseId, itemId } });
      const parsed = parseStockBalance(res.data);
      if (!parsed) {
        setMsg("השרת החזיר תשובה לא צפויה עבור מלאי.");
        return;
      }
      setData(parsed);
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setLoadingStock(false);
    }
  }

  const onHand = data ? toNumber(data.onHand) : 0;
  const reserved = data ? toNumber(data.reserved) : 0;
  const available = Math.max(0, onHand - reserved);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>מלאי לפי מחסן + מוצר</h2>
          <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>מחפשים לפי שם → בודקים מלאי לפי IDs מול השרת</div>
        </div>

        <button
          onClick={loadStock}
          disabled={loadingLists || loadingStock}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.10)",
            cursor: loadingLists || loadingStock ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {loadingStock ? "בודק..." : "בדוק מלאי"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Warehouse */}
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>מחסן</div>

          <input
            value={warehouseQuery}
            onChange={(e) => setWarehouseQuery(e.target.value)}
            placeholder="חפש לפי שם/קוד (למשל: תל אביב)"
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
              disabled={loadingLists}
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
              <option value="">{loadingLists ? "טוען מחסנים..." : "בחר מחסן"}</option>
              {filteredWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {selectedWarehouse && (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
              נבחר: <b>{selectedWarehouse.name}</b> • קוד: <b>{selectedWarehouse.code}</b>
            </div>
          )}
        </div>

        {/* Item */}
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>מוצר</div>

          <input
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            placeholder="חפש לפי שם/SKU (למשל: אייפון)"
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
              disabled={loadingLists}
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
              <option value="">{loadingLists ? "טוען מוצרים..." : "בחר מוצר"}</option>
              {filteredItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
              נבחר: <b>{selectedItem.name}</b> • SKU: <b>{selectedItem.sku}</b>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.12)", fontWeight: 700 }}>
          {msg}
        </div>
      )}

      <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", overflow: "auto" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>תוצאה</div>

        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: "right", opacity: 0.8 }}>
              <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מחסן</th>
              <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מוצר</th>
              <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>On Hand</th>
              <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Reserved</th>
              <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Available</th>
            </tr>
          </thead>

          <tbody>
            {!data ? (
              <tr>
                <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>
                  אין תוצאה עדיין. בחר מחסן ומוצר ואז לחץ “בדוק מלאי”.
                </td>
              </tr>
            ) : (
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.code})` : data.warehouseId}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {selectedItem ? `${selectedItem.name} (${selectedItem.sku})` : data.itemId}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>{fmtQty(data.onHand)}</td>
                <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>{fmtQty(data.reserved)}</td>
                <td
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontWeight: 900,
                    color: available <= 0 ? "#FF6B6B" : "#7CFF9B",
                  }}
                >
                  {available.toLocaleString("he-IL", { maximumFractionDigits: 3 })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}