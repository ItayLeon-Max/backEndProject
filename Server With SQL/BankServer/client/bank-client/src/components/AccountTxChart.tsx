// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   type TooltipProps,
// } from "recharts";

// type Tx = {
//   id: string;
//   amount: string;
//   createdAt: string;
//   signedAmount?: number;
// };

// function formatDate(iso: string) {
//   try {
//     return new Date(iso).toLocaleDateString("he-IL", {
//       day: "2-digit",
//       month: "2-digit",
//     });
//   } catch {
//     return iso;
//   }
// }

// function formatMoney(v: unknown) {
//   const n = Number(v);
//   if (!Number.isFinite(n)) return String(v ?? "");
//   return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
// }

// type ChartPoint = {
//   date: string;
//   balance: number;
// };

// export default function AccountTxChart({ items }: { items: Tx[] }) {
//   if (!items?.length) {
//     return <div className="chartEmpty">אין תנועות להצגה</div>;
//   }

//   const data: ChartPoint[] = [...items]
//     .slice() 
//     .reverse()
//     .reduce<ChartPoint[]>((arr, t) => {
//       const prev = arr.length ? arr[arr.length - 1].balance : 0;

//       const deltaRaw = t.signedAmount ?? Number(t.amount);
//       const delta = Number.isFinite(Number(deltaRaw)) ? Number(deltaRaw) : 0;

//       arr.push({
//         date: formatDate(t.createdAt),
//         balance: prev + delta,
//       });

//       return arr;
//     }, []);

//   const last = data[data.length - 1]?.balance ?? 0;
//   const lineColor = last < 0 ? "#FF6B6B" : "#7CFF9B";

//   const tooltipFormatter: TooltipProps<number, string>["formatter"] = (value) => {
//     return formatMoney(value);
//   };

//   return (
//     <div className="chartBox">
//       <div className="chartTitle">📈 תנועות בחשבון</div>

//       <ResponsiveContainer width="100%" height={220}>
//         <LineChart data={data}>
//           <CartesianGrid stroke="rgba(255,255,255,0.1)" />
//           <XAxis dataKey="date" stroke="#aaa" />
//           <YAxis stroke="#aaa" />
//           <Tooltip
//             formatter={tooltipFormatter}
//             contentStyle={{
//               background: "#111",
//               border: "1px solid #333",
//               borderRadius: 8,
//             }}
//           />
//           <Line type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={3} dot={false} />
//         </LineChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartItem = {
  id: string;
  createdAt: string;
  signedAmount: number;
};

type Props = {
  currentBalance: number;
  items: ChartItem[];
};

function formatMoneyAny(value: unknown): string {
  // recharts עלול להעביר גם array
  const v = Array.isArray(value) ? value[0] : value;

  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
  }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AccountTxChart({ currentBalance, items }: Props) {
  const data = useMemo(() => {
    if (!items.length) return [];

    const sorted = [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let bal = Number(currentBalance);

    // בונים סדרה כך שהנקודה האחרונה == currentBalance
    return [...sorted]
      .reverse()
      .map((t) => {
        const point = { date: formatDate(t.createdAt), balance: bal };
        bal -= Number(t.signedAmount ?? 0);
        return point;
      })
      .reverse();
  }, [items, currentBalance]);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontWeight: 900 }}>גרף יתרה לפי תנועות</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        נקודה אחרונה = יתרה נוכחית
      </div>

      <div style={{ height: 10 }} />

      {data.length < 2 ? (
        <div className="hint">אין מספיק תנועות להצגת גרף.</div>
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 11 }}
                tickFormatter={(v) => formatMoneyAny(v)}
              />
              <Tooltip
                formatter={(v) => formatMoneyAny(v)}
                labelFormatter={(label) => `תאריך: ${label}`}
                contentStyle={{
                  background: "rgba(20,20,20,0.92)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="rgba(124,255,155,0.75)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}