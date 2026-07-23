// ============================================================
// Dashboard.jsx — PaySphereX Role-Based Dashboard Router
// Routes to AdminDashboard or EmployeeDashboard by user role.
// This is the ONLY file that should be changed in this update.
// ============================================================
import React from "react";
import AdminDashboard    from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import { useAuth }       from "../context/AuthContext";

const ADMIN_ROLES = ["admin", "hr", "manager"];

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    // Still authenticating — show a minimal loading state
    return (
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        height:         300,
        color:          "var(--text-muted)",
        fontSize:       14,
      }}>
        Loading dashboard…
      </div>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(user.role);

  return isAdmin
    ? <AdminDashboard    user={user} />
    : <EmployeeDashboard user={user} />;
}
