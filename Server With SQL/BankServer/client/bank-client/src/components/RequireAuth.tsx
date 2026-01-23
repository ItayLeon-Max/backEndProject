// import React from "react";
// import { Navigate } from "react-router-dom";
// import { getToken } from "../utils/auth";

// export default function RequireAuth({ children }: { children: React.ReactNode }) {
//   const token = getToken();
//   if (!token) return <Navigate to="/" replace />;
//   return <>{children}</>;
// }

import { Navigate, Outlet } from "react-router-dom";

type JwtPayload = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const json = atob(payload);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

type Props = {
  requireAdmin?: boolean;
};

export default function RequireAuth({ requireAdmin }: Props) {
  const token = localStorage.getItem("jwt");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const payload = decodeJwt(token);

  if (!payload) {
    localStorage.removeItem("jwt");
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && payload.role?.toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}