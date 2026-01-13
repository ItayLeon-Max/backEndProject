export type Role = "admin" | "user";

export type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: Role;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
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

export function getToken() {
  return localStorage.getItem("jwt") ?? "";
}

export function getMeFromToken(): JwtPayload | null {
  const t = getToken();
  return t ? decodeJwtPayload(t) : null;
}

export function isAdmin(): boolean {
  return getMeFromToken()?.role === "admin";
}