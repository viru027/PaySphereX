// ============================================================
// src/pages/Dashboard.js
// ============================================================
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { analyticsAPI, attendanceAPI } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, CreditCard, CalendarCheck, Clock, TrendingUp,
  TrendingDown, Minus, AlertTriangle,
} from "lucide-react";

// ── Custom Tooltip ────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:8, padding:"10px 14px", fontSize:12, boxShadow:"var(--shadow-md)" }}>
      <p style={{ fontWeight:600, marginBottom:4, color:"var(--text-primary)" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000
            ? `₹${(p.value/1000).toFixed(1)}K`
            : p.value}
        </p>
      ))}
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div className="kpi-card">
      <div className="kpi-accent-bar" style={{ background: color }} />
      <div style={{ paddingLeft: 12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <span className="kpi-label">{label}</span>
          <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon size={16} color={color} />
          </div>
        </div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-sub" style={{ display:"flex", alignItems:"center", gap:4 }}>
          {trend === "up"   && <TrendingUp   size={12} color="#22C55E" />}
          {trend === "down" && <TrendingDown  size={12} color="#EF4444" />}
          {trend === "flat" && <Minus         size={12} color="#94A3B8" />}
          {sub}
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div className="card">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const COLORS = ["#14B8A6","#3B82F6","#A855F7","#F59E0B","#EF4444","#22C55E"];

export default function Dashboard() {
  const { user }                   = useAuth();
  const [data, setData]            = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading]      = useState(true);
  const [checkingIn, setCheckingIn]= useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.dashboard(),
      attendanceAPI.getSummary({ month: new Date().getMonth()+1, year: new Date().getFullYear() }),
    ]).then(([dash, att]) => {
      setData(dash.data.data);
      setTodayStatus(att.data.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckIn  = async () => {
    setCheckingIn(true);
    try {
      await attendanceAPI.checkIn({ location: "office" });
      window.location.reload();
    } finally { setCheckingIn(false); }
  };
  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      await attendanceAPI.checkOut({});
      window.location.reload();
    } finally { setCheckingIn(false); }
  };

  if (loading) {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20 }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} className="skeleton" style={{ height: i < 4 ? 100 : 300, borderRadius:"var(--radius-lg)" }} />
        ))}
      </div>
    );
  }

  const fmt = (n) => n ? `₹${(parseFloat(n)/1000).toFixed(1)}K` : "₹0";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Welcome bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName || "Viraj"} 👋</h1>
          <p className="page-subtitle">Here's what's happening at your company today.</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-primary" onClick={handleCheckIn} disabled={checkingIn}>
            Check In
          </button>
          <button className="btn btn-secondary" onClick={handleCheckOut} disabled={checkingIn}>
            Check Out
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
        <KPICard
          label="Total Headcount"
          value={data?.headcount?.active || 0}
          sub={`${data?.headcount?.total || 0} total employees`}
          color="var(--teal-500)"
          icon={Users}
          trend="up"
        />
        <KPICard
          label="Net Payroll (Month)"
          value={data?.payroll?.total_net > 0 ? fmt(data.payroll.total_net) : fmt(data?.payroll?.total_gross)}
          sub={`Avg ${fmt(data?.payroll?.avg_net || data?.payroll?.avg_gross)} per employee`}
          color="var(--blue-500)"
          icon={CreditCard}
          trend="flat"
        />
        <KPICard
          label="On Leave Today"
          value={data?.leave?.on_leave_today || 0}
          sub={`${data?.leave?.pending_requests || 0} pending approvals`}
          color="var(--amber-500)"
          icon={CalendarCheck}
          trend="down"
        />
        <KPICard
          label="Present Today"
          value={data?.attendance?.present || 0}
          sub={`${data?.attendance?.wfh || 0} working from home`}
          color="var(--green-500)"
          icon={Clock}
          trend="up"
        />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
        {/* Payroll Trend */}
        <Section title="Payroll Trend — Last 6 Months">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data?.payrollTrend || []} margin={{ top:5, right:10, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="pay_period" tick={{ fontSize:11, fill:"var(--text-muted)" }} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize:11, fill:"var(--text-muted)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Area type="monotone" dataKey="gross" name="Gross Payroll" stroke="#14B8A6" strokeWidth={2} fill="url(#grossGrad)" />
              <Area type="monotone" dataKey="net"   name="Net Payroll"   stroke="#3B82F6" strokeWidth={2} fill="url(#netGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Department Headcount */}
        <Section title="Headcount by Department">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data?.departments || []}
                dataKey="headcount"
                nameKey="department"
                cx="50%" cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
              >
                {(data?.departments || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend
                layout="vertical"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize:11 }}
                formatter={(v) => {
                  if (typeof v !== "string") return "";
                  return v.length > 14 ? v.slice(0,14) + "…" : v;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Dept avg salary */}
        <Section title="Average Salary by Department">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.departments || []} margin={{ top:5, right:5, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dept_code" tick={{ fontSize:10 }} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize:10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_base_salary" name="Avg Base Salary" fill="#A855F7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Recent joiners */}
        <Section title="Recent Joiners">
          {data?.recentJoiners?.length ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {data.recentJoiners.map((emp, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div className="avatar avatar-sm">
                    {emp.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{emp.full_name}</div>
                    <div style={{ fontSize:11, color:"var(--text-secondary)" }}>{emp.job_title} · {emp.department}</div>
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>
                    {new Date(emp.date_joined).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Users size={32} />
              <p>No joiners in last 90 days</p>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
