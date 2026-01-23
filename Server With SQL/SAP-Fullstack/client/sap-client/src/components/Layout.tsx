import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0b1220", color: "white" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, opacity: 0.9 }}>מערכת לניהול מלאי</div>
          <button onClick={logout} style={{ padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}>
            Logout
          </button>
        </div>

        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}