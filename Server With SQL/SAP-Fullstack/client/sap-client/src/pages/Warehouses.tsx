import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { getErrorMessage } from "../api/error";
import type { Warehouse } from "../types/models";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
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

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function refresh() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await api.get("/warehouses");
      setWarehouses(parseWarehouses(res.data));
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setMsg(null);
      try {
        const res = await api.get("/warehouses");
        if (!alive) return;
        setWarehouses(parseWarehouses(res.data));
      } catch (e: unknown) {
        if (!alive) return;
        setMsg(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, []);

  async function createWarehouse() {
    setMsg(null);

    const c = code.trim();
    const n = name.trim();

    if (!c || !n) {
      setMsg("מלא code ו-name.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/warehouses", { code: c, name: n });
      setCode("");
      setName("");
      await refresh();
      setMsg("✅ מחסן נוסף בהצלחה.");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return warehouses;
    return warehouses.filter((w) => w.name.toLowerCase().includes(s) || w.code.toLowerCase().includes(s));
  }, [warehouses, q]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>מחסנים</h2>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={refresh} disabled={loading || busy}>
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

      {/* Create */}
      <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>הוספת מחסן חדש</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="למשל: TLV"
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

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: תל אביב מרכזי"
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

          <button className="btn btn-primary" onClick={createWarehouse} disabled={busy}>
            {busy ? "שומר..." : "הוסף"}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>רשימת מחסנים</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש לפי שם/קוד…"
            style={{
              width: 260,
              maxWidth: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginTop: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "right", opacity: 0.85 }}>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Code</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Name</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>ID</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                    טוען...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                    אין מחסנים.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>{w.code}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{w.name}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: 0.85, wordBreak: "break-all" }}>
                      {w.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}