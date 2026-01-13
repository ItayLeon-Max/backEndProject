export type Role = "user" | "admin";

export function toRole(v: unknown): Role {
  if (v === "admin" || v === "user") return v;

  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "admin") return "admin";
    if (s === "user") return "user";

    // תאימות אחורה אם נשמרו בבסיס נתונים/נשלחים מהלקוח:
    if (v === "Admin") return "admin";
    if (v === "User") return "user";
  }

  return "user";
}