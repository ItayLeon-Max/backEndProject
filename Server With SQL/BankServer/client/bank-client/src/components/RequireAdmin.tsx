import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getMeFromToken } from "../utils/auth";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/" replace />;

  const me = getMeFromToken();
  if (!me || me.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}