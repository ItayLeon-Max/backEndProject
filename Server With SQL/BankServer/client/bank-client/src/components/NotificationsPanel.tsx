// import { useEffect } from "react";

// export type NotificationKind = "ok" | "err" | "warn" | "info";

// export type NotificationItem = {
//   id: string;
//   kind: NotificationKind;
//   text: string;
//   createdAt: number; // Date.now()
//   ttlMs?: number; // אם רוצים שייעלם אוטומטית
// };

// function titleByKind(kind: NotificationKind) {
//   if (kind === "ok") return "Success";
//   if (kind === "err") return "Error";
//   if (kind === "warn") return "Warning";
//   return "Info";
// }

// function borderByKind(kind: NotificationKind) {
//   if (kind === "ok") return "1px solid rgba(124,255,155,0.35)";
//   if (kind === "err") return "1px solid rgba(255,107,107,0.45)";
//   if (kind === "warn") return "1px solid rgba(255,200,87,0.45)";
//   return "1px solid rgba(120,180,255,0.35)";
// }

// function glowByKind(kind: NotificationKind) {
//   if (kind === "ok") return "0 0 0 1px rgba(124,255,155,0.12), 0 10px 30px rgba(124,255,155,0.08)";
//   if (kind === "err") return "0 0 0 1px rgba(255,107,107,0.14), 0 10px 30px rgba(255,107,107,0.08)";
//   if (kind === "warn") return "0 0 0 1px rgba(255,200,87,0.14), 0 10px 30px rgba(255,200,87,0.08)";
//   return "0 0 0 1px rgba(120,180,255,0.12), 0 10px 30px rgba(120,180,255,0.08)";
// }

// function iconByKind(kind: NotificationKind) {
//   if (kind === "ok") return "✅";
//   if (kind === "err") return "⛔";
//   if (kind === "warn") return "⚠️";
//   return "ℹ️";
// }

// export default function NotificationsPanel({
//   items,
//   onDismiss,
//   title = "התראות",
// }: {
//   items: NotificationItem[];
//   onDismiss: (id: string) => void;
//   title?: string;
// }) {
//   // Auto-dismiss לפי ttlMs
//   useEffect(() => {
//     const timers: number[] = [];

//     for (const n of items) {
//       if (typeof n.ttlMs === "number" && n.ttlMs > 0) {
//         const elapsed = Date.now() - n.createdAt;
//         const left = Math.max(0, n.ttlMs - elapsed);

//         const t = window.setTimeout(() => onDismiss(n.id), left);
//         timers.push(t);
//       }
//     }

//     return () => timers.forEach((t) => window.clearTimeout(t));
//   }, [items, onDismiss]);

//   return (
//     <div
//       style={{
//         position: "sticky",
//         top: 18,
//         alignSelf: "start",
//         borderRadius: 18,
//         border: "1px solid rgba(255,255,255,0.12)",
//         background: "rgba(255,255,255,0.06)",
//         padding: 14,
//         backdropFilter: "blur(10px)",
//         minHeight: 180,
//       }}
//     >
//       <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
//         <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
//         <div style={{ fontSize: 12, opacity: 0.75 }}>{items.length ? `${items.length}` : ""}</div>
//       </div>

//       <div style={{ height: 10 }} />

//       {!items.length ? (
//         <div style={{ opacity: 0.75, fontSize: 13, padding: 10, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)" }}>
//           אין התראות כרגע ✨
//         </div>
//       ) : (
//         <div style={{ display: "grid", gap: 10 }}>
//           {items.map((n) => (
//             <div
//               key={n.id}
//               style={{
//                 borderRadius: 14,
//                 border: borderByKind(n.kind),
//                 background: "rgba(0,0,0,0.18)",
//                 boxShadow: glowByKind(n.kind),
//                 padding: 12,
//                 transform: "translateY(0)",
//                 animation: "notifPop 160ms ease-out",
//               }}
//             >
//               <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
//                 <div style={{ minWidth: 0 }}>
//                   <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
//                     <span>{iconByKind(n.kind)}</span>
//                     <span>{titleByKind(n.kind)}</span>
//                   </div>
//                   <div style={{ marginTop: 6, opacity: 0.92, fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>{n.text}</div>
//                 </div>

//                 <button
//                   type="button"
//                   onClick={() => onDismiss(n.id)}
//                   className="btnGhostSmall"
//                   style={{ padding: "6px 10px" }}
//                   aria-label="Dismiss"
//                 >
//                   ✕
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* animation keyframes inline (בלי לשבור לך קבצי CSS) */}
//       <style>
//         {`
//           @keyframes notifPop {
//             from { opacity: 0; transform: translateY(-6px) scale(0.985); }
//             to   { opacity: 1; transform: translateY(0) scale(1); }
//           }
//         `}
//       </style>
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";

export type AppNotification = {
  id: string;
  kind: "ok" | "err" | "info";
  title: string;
  text?: string;
  createdAt: string; // ISO
};

const STORAGE_KEY = "bank_notifications_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function pushNotification(n: Omit<AppNotification, "id" | "createdAt">) {
  const list = safeParse<AppNotification[]>(localStorage.getItem(STORAGE_KEY), []);
  const item: AppNotification = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...n,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...list].slice(0, 50)));
  // להודיע לכל הטאבים/קומפוננטות
  window.dispatchEvent(new Event("bank:notifications"));
}

// eslint-disable-next-line react-refresh/only-export-components
export function clearNotifications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("bank:notifications"));
}

export default function NotificationsPanel() {
  const [items, setItems] = useState<AppNotification[]>(() => safeParse<AppNotification[]>(localStorage.getItem(STORAGE_KEY), []));

  useEffect(() => {
    const reload = () => setItems(safeParse<AppNotification[]>(localStorage.getItem(STORAGE_KEY), []));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };

    window.addEventListener("bank:notifications", reload);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bank:notifications", reload);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const has = useMemo(() => items.length > 0, [items.length]);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>התראות</div>
        <button className="btnGhostSmall" onClick={clearNotifications} type="button" disabled={!has}>
          ניקוי
        </button>
      </div>

      <div style={{ height: 10 }} />

      {!has ? (
        <div className="hint">אין התראות כרגע.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => {
            const border =
              n.kind === "err"
                ? "1px solid rgba(255,107,107,0.35)"
                : n.kind === "ok"
                ? "1px solid rgba(124,255,155,0.28)"
                : "1px solid rgba(255,255,255,0.14)";

            const titleColor = n.kind === "err" ? "#FF6B6B" : n.kind === "ok" ? "#7CFF9B" : "rgba(255,255,255,0.9)";

            return (
              <div
                key={n.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border,
                  background: "rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: titleColor }}>{n.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{formatDate(n.createdAt)}</div>
                </div>
                {n.text ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{n.text}</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}