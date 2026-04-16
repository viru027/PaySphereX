// ============================================================
// src/components/layout/Sidebar.js
// ============================================================
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, CalendarDays,
  Clock, BarChart3, User, LogOut, Globe, ChevronRight,
} from "lucide-react";

const allNavItems = [
  { to: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard, roles: ["admin","hr","manager","employee"] },
  { to: "/employees",  label: "Employees",   icon: Users,           roles: ["admin","hr","manager"] },
  { to: "/payroll",    label: "Payroll",     icon: CreditCard,      roles: ["admin","hr"] },
  { to: "/leaves",     label: "Leave",       icon: CalendarDays,    roles: ["admin","hr","manager","employee"] },
  { to: "/attendance", label: "Attendance",  icon: Clock,           roles: ["admin","hr","manager","employee"] },
  { to: "/analytics",  label: "Analytics",   icon: BarChart3,       roles: ["admin","hr","manager"] },
  { to: "/profile",    label: "My Profile",  icon: User,            roles: ["admin","hr","manager","employee"] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:40 }}
          onClick={onClose}
        />
      )}

      <aside style={{
        gridRow:       "1 / -1",
        width:         "var(--sidebar-w)",
        background:    "var(--bg-sidebar)",
        display:       "flex",
        flexDirection: "column",
        position:      "sticky",
        top:           0,
        height:        "100vh",
        overflow:      "hidden",
        zIndex:        50,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--teal-500), var(--blue-500))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Globe size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: 15, letterSpacing: "-.02em" }}>
                PaySphereX
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Workforce Platform
              </div>
            </div>
          </div>
        </div>

        {/* User chip */}
        <div style={{ padding: "14px 16px", margin: "12px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar avatar-sm" style={{ fontSize: 13 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "capitalize" }}>
                {user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em", padding: "8px 12px 6px" }}>
            Menu
          </div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              style={({ isActive }) => ({
                display:        "flex",
                alignItems:     "center",
                gap:            10,
                padding:        "9px 12px",
                borderRadius:   "var(--radius-md)",
                marginBottom:   2,
                fontSize:       13,
                fontWeight:     isActive ? 600 : 400,
                color:          isActive ? "#fff" : "rgba(255,255,255,.55)",
                background:     isActive ? "rgba(45,212,191,.15)" : "transparent",
                borderLeft:     isActive ? "3px solid var(--teal-400)" : "3px solid transparent",
                transition:     "all 150ms ease",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={12} style={{ opacity: .6 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ width: "100%", color: "rgba(255,255,255,.5)", gap: 10, justifyContent: "flex-start" }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
