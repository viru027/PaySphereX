// ============================================================
// src/components/layout/Header.js
// ============================================================
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const pageTitles = {
  "/dashboard":  "Dashboard",
  "/employees":  "Employees",
  "/payroll":    "Payroll",
  "/leaves":     "Leave Management",
  "/attendance": "Attendance",
  "/analytics":  "Analytics",
  "/profile":    "My Profile",
};

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user }     = useAuth();
  const title        = pageTitles[pathname] || "PaySphereX";

  return (
    <header style={{
      gridColumn:     2,
      gridRow:        1,
      height:         "var(--header-h)",
      background:     "var(--white)",
      borderBottom:   "1px solid var(--border)",
      display:        "flex",
      alignItems:     "center",
      padding:        "0 24px",
      gap:            16,
      position:       "sticky",
      top:            0,
      zIndex:         30,
    }}>
      <button className="btn-ghost" onClick={onMenuClick} style={{ display: "none" }}>
        <Menu size={20} />
      </button>

      <div style={{ flex: 1 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
          {title}
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <button className="btn btn-ghost" title="Search">
          <Search size={18} />
        </button>
        <button className="btn btn-ghost" title="Notifications">
          <Bell size={18} />
        </button>
        <Link to="/profile" style={{ textDecoration:"none" }}>
          <div className="avatar avatar-sm" title={`${user?.firstName} ${user?.lastName}`}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </Link>
      </div>
    </header>
  );
}
