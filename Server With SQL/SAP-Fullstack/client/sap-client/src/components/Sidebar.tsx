import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "white",
  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
});

export default function Sidebar() {
  return (
    <div style={{ width: 240, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 12 }}>📦 SAP Lite</div>

      <nav style={{ display: "grid", gap: 8 }}>
        <NavLink to="/stock" style={linkStyle}>מלאי</NavLink>
        <NavLink to="/orders" style={linkStyle}>הזמנות</NavLink>
        <NavLink to="/transfers" style={linkStyle}>העברות</NavLink>
        <NavLink to="/warehouses" style={linkStyle}>מחסנים</NavLink>
        <NavLink to="/items" style={linkStyle}>מוצרים</NavLink>
      </nav>
    </div>
  );
}