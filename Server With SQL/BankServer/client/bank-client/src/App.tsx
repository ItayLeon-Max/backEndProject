import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Admin from "./pages/admin";
import AdminUserLoans from "./pages/AdminUserLoans";
import Overdraft from "./pages/Overdraft";
import AdminOverdraftRequests from "./pages/AdminOverdraftRequests"; // ✅ חדש

type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("jwt");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("jwt");
  if (!token) return <Navigate to="/" replace />;

  const payload = decodeJwtPayload(token);
  const role = String(payload?.role ?? "").trim().toLowerCase();

  // אם הטוקן לא תקין/אין role – מחזירים ל-login
  if (!payload?.id || !role) return <Navigate to="/" replace />;

  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/overdraft"
          element={
            <RequireAuth>
              <Overdraft />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/users/:id/loans"
          element={
            <RequireAdmin>
              <AdminUserLoans />
            </RequireAdmin>
          }
        />

        {/* ✅ מסך מנהל: בקשות מסגרת */}
        <Route
          path="/admin/overdraft"
          element={
            <RequireAdmin>
              <AdminOverdraftRequests />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}