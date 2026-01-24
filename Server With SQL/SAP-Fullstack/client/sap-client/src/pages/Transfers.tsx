import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { getErrorMessage } from "../api/error";
import type { Warehouse, Item } from "../types/models";

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
function fmtQty3(n: number): string {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 3 });
}

type TransferStatus = "draft" | "submitted" | "in_transit" | "received" | "cancelled";

type TransferLineLocal = {
  id: string; // local id for react key
  itemId: string;
  qty: number;
};

type TransferDoc = {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  createdAt?: string;
  updatedAt?: string;
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

function parseTransferDoc(data: unknown): TransferDoc | null {
  if (!isRecord(data)) return null;
  const id = str(data.id).trim();
  const fromWarehouseId = str(data.fromWarehouseId).trim();
  const toWarehouseId = str(data.toWarehouseId).trim();
  const status = str(data.status).trim() as TransferStatus;

  if (!id || !fromWarehouseId || !toWarehouseId) return null;
  if (!["draft", "submitted", "in_transit", "received", "cancelled"].includes(status)) return null;

  return {
    id,
    fromWarehouseId,
    toWarehouseId,
    status,
    createdAt: str((data as UnknownRecord).createdAt ?? ""),
    updatedAt: str((data as UnknownRecord).updatedAt ?? ""),
  };
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Transfers() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");

  const [itemQuery, setItemQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState<number>(1);

  const [lines, setLines] = useState<TransferLineLocal[]>([]);
  const [doc, setDoc] = useState<TransferDoc | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadLists() {
      setLoadingLists(true);
      setMsg(null);
      try {
        const [wRes, iRes] = await Promise.all([api.get("/warehouses"), api.get("/items")]);
        if (!alive) return;
        setWarehouses(parseWarehouses(wRes.data));
        setItems(parseItems(iRes.data));
      } catch (e: unknown) {
        if (!alive) return;
        setMsg(getErrorMessage(e));
      } finally {
        if (alive) setLoadingLists(false);
      }
    }

    loadLists();
    return () => {
      alive = false;
    };
  }, []);

  const whName = (id: string) => {
    const w = warehouses.find((x) => x.id === id);
    return w ? `${w.name} (${w.code})` : id;
  };

  const itemName = (id: string) => {
    const it = items.find((x) => x.id === id);
    return it ? `${it.name} (${it.sku})` : id;
  };

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
  }, [items, itemQuery]);

  const canCreate = fromWarehouseId && toWarehouseId && fromWarehouseId !== toWarehouseId;
  const canAddLine = !!selectedItemId && Number.isFinite(qty) && qty > 0;

  function addLocalLine() {
    setMsg(null);

    if (!canAddLine) {
      setMsg("בחר מוצר וכמות חיובית.");
      return;
    }

    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === selectedItemId);
      if (idx === -1) return [...prev, { id: uid(), itemId: selectedItemId, qty }];
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      return next;
    });

    setQty(1);
  }

  function removeLine(lineId: string) {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }

  function resetAll() {
    setDoc(null);
    setLines([]);
    setFromWarehouseId("");
    setToWarehouseId("");
    setSelectedItemId("");
    setItemQuery("");
    setQty(1);
    setMsg(null);
  }

  async function createTransfer() {
    setMsg(null);
    if (!canCreate) {
      setMsg("בחר מחסן מקור ויעד (שונים) ואז לחץ יצירה.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/transfers", {
        fromWarehouseId,
        toWarehouseId,
        note: null,
      });

      const parsed = parseTransferDoc(res.data);
      if (!parsed) {
        setMsg("השרת החזיר תשובה לא צפויה ביצירת העברה.");
        return;
      }
      setDoc(parsed);
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function pushLinesToServer() {
    setMsg(null);
    if (!doc) {
      setMsg("קודם יוצרים מסמך העברה.");
      return;
    }
    if (!lines.length) {
      setMsg("אין שורות להעברה. הוסף לפחות מוצר אחד.");
      return;
    }

    setBusy(true);
    try {
      for (const l of lines) {
        await api.post(`/transfers/${doc.id}/lines`, { itemId: l.itemId, qty: l.qty });
      }
      setMsg("✅ השורות נשמרו בהעברה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setMsg(null);
    if (!doc) return;

    setBusy(true);
    try {
      const res = await api.post(`/transfers/${doc.id}/submit`);
      const parsed =
        parseTransferDoc(res.data) ?? parseTransferDoc((res.data as unknown as UnknownRecord)?.transfer);
      setDoc(parsed ?? doc);
      setMsg("✅ הועבר לסטטוס submitted.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function receive() {
    setMsg(null);
    if (!doc) return;

    setBusy(true);
    try {
      const res = await api.post(`/transfers/${doc.id}/receive`, { note: null });
      const parsed =
        parseTransferDoc(res.data) ?? parseTransferDoc((res.data as unknown as UnknownRecord)?.transfer);
      setDoc(parsed ?? doc);
      setMsg("✅ התקבל. המלאי וה־ledger עודכנו.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setMsg(null);
    if (!doc) return;

    setBusy(true);
    try {
      const res = await api.post(`/transfers/${doc.id}/cancel`);
      const parsed =
        parseTransferDoc(res.data) ?? parseTransferDoc((res.data as unknown as UnknownRecord)?.transfer);
      setDoc(parsed ?? doc);
      setMsg("✅ בוטל.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = (s: TransferStatus) => {
    const map: Record<TransferStatus, { label: string; bg: string; border: string }> = {
      draft: { label: "Draft", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.14)" },
      submitted: { label: "Submitted", bg: "rgba(90,170,255,0.14)", border: "rgba(90,170,255,0.25)" },
      in_transit: { label: "In Transit", bg: "rgba(255,200,90,0.14)", border: "rgba(255,200,90,0.25)" },
      received: { label: "Received", bg: "rgba(124,255,155,0.12)", border: "rgba(124,255,155,0.22)" },
      cancelled: { label: "Cancelled", bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.22)" },
    };
    const x = map[s];
    return (
      <span
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: `1px solid ${x.border}`,
          background: x.bg,
          fontWeight: 900,
        }}
      >
        {x.label}
      </span>
    );
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>העברות בין מחסנים</h2>
          <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>תהליך: יצירה → שורות → Submit → Receive</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {doc && statusBadge(doc.status)}
          <button
            onClick={resetAll}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ניקוי
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

      {/* Step 1: create transfer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>מחסן מקור</div>
          <select
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            disabled={loadingLists || !!doc}
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
            <option value="">{loadingLists ? "טוען..." : "בחר מחסן מקור"}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>מחסן יעד</div>
          <select
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            disabled={loadingLists || !!doc}
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
            <option value="">{loadingLists ? "טוען..." : "בחר מחסן יעד"}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={createTransfer}
          disabled={busy || loadingLists || !!doc || !canCreate}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: canCreate ? "rgba(124,255,155,0.12)" : "rgba(255,255,255,0.06)",
            cursor: busy || loadingLists || !!doc || !canCreate ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {doc ? "נוצר" : busy ? "יוצר..." : "צור העברה"}
        </button>

        {doc && (
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            מזהה העברה: <b>{doc.id}</b> • {whName(doc.fromWarehouseId)} → {whName(doc.toWarehouseId)}
          </div>
        )}
      </div>

      {/* Step 2: lines */}
      <div
        style={{
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>שורות להעברה</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>מוסיפים כאן מקומית, ואז שולחים לשרת</div>
          </div>

          <button
            onClick={pushLinesToServer}
            disabled={!doc || busy || !lines.length}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: !doc || !lines.length ? "rgba(255,255,255,0.06)" : "rgba(90,170,255,0.14)",
              cursor: !doc || busy || !lines.length ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {busy ? "שולח..." : "שמור שורות בשרת"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, marginTop: 12, alignItems: "end" }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>מוצר</div>
            <input
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              placeholder="חפש מוצר לפי שם / SKU"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.18)",
                color: "inherit",
                outline: "none",
                marginBottom: 8,
              }}
            />
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
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
              <option value="">{loadingLists ? "טוען..." : "בחר מוצר"}</option>
              {filteredItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>כמות</div>
            <input
              type="number"
              value={String(qty)}
              onChange={(e) => setQty(toNumber(e.target.value))}
              min={0}
              step="1"
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

          <button
            onClick={addLocalLine}
            disabled={!canAddLine}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: canAddLine ? "rgba(124,255,155,0.12)" : "rgba(255,255,255,0.06)",
              cursor: canAddLine ? "pointer" : "not-allowed",
              fontWeight: 900,
              height: 42,
            }}
          >
            הוסף
          </button>
        </div>

        <div style={{ marginTop: 14, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "right", opacity: 0.85 }}>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>מוצר</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)", width: 140 }}>כמות</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {!lines.length ? (
                <tr>
                  <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                    אין שורות עדיין.
                  </td>
                </tr>
              ) : (
                lines.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{itemName(l.itemId)}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                      {fmtQty3(l.qty)}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        onClick={() => removeLine(l.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,107,107,0.12)",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 3: status actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={submit}
          disabled={!doc || busy || doc.status !== "draft"}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: doc?.status === "draft" ? "rgba(90,170,255,0.14)" : "rgba(255,255,255,0.06)",
            cursor: !doc || busy || doc.status !== "draft" ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          אשר לפני קליטה
        </button>

        <button
          onClick={receive}
          disabled={!doc || busy || doc.status !== "submitted"}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: doc?.status === "submitted" ? "rgba(124,255,155,0.12)" : "rgba(255,255,255,0.06)",
            cursor: !doc || busy || doc.status !== "submitted" ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          קליטה למחסן
        </button>

        <button
          onClick={cancel}
          disabled={!doc || busy || doc.status === "received" || doc.status === "cancelled"}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,107,107,0.12)",
            cursor: !doc || busy || doc.status === "received" || doc.status === "cancelled" ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}