// ============================================================
// AdminDashboard.jsx — PaySphereX Admin / HR / Manager View
// Clean enterprise SaaS dashboard using existing APIs
// ============================================================
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { analyticsAPI } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, DollarSign, Clock, TrendingDown,
  Flame, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw, ChevronRight, Activity,
} from "lucide-react";

// ── Palette (matches existing app tokens) ─────────────────
const C = {
  teal:   "#14B8A6",
  blue:   "#3B82F6",
  red:    "#EF4444",
  amber:  "#F59E0B",
  green:  "#22C55E",
  orange: "#F97316",
  purple: "#8B5CF6",
  slate:  "#64748B",
};

// ── Helpers ───────────────────────────────────────────────
const fmtK  = n => n ? `₹${(parseFloat(n) / 1000).toFixed(1)}K` : "—";
const fmtL  = n => n ? `₹${parseFloat(n).toLocaleString("en-IN")}` : "—";
const round = n => parseFloat(n || 0).toFixed(1);

function computeBurnoutScore(emp) {
  const score = Math.min(100, Math.round(
    Math.min(40, parseFloat(emp.total_overtime  || 0) * 0.8) +
    Math.min(25, parseFloat(emp.sick_leave_days || emp.absent_days || 0) * 3.5) +
    Math.min(20, parseFloat(emp.absent_days     || 0) * 2.5) +
    (parseFloat(emp.avg_work_hours || 8) > 10
      ? Math.min(15, (parseFloat(emp.avg_work_hours) - 8) * 3) : 0)
  ));
  return score >= 70 ? "Critical" : score >= 45 ? "High" : score >= 25 ? "Moderate" : "Healthy";
}

// ── Shared micro-components ───────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,.10)",
    }}>
      <p style={{ fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>
            {typeof p.value === "number" && p.value > 999
              ? `₹${(p.value / 1000).toFixed(1)}K` : p.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

function KPICard({ label, value, sub, subTrend, color, icon: Icon, loading }) {
  const trendColor = subTrend === "up" ? C.green : subTrend === "down" ? C.red : C.slate;
  const TrendIcon  = subTrend === "up" ? ArrowUpRight : subTrend === "down" ? ArrowDownRight : Minus;
  return (
    <div style={{
      background:    "#fff",
      border:        "1px solid #E2E8F0",
      borderRadius:  12,
      padding:       "20px 22px",
      borderTop:     `3px solid ${color}`,
      display:       "flex",
      flexDirection: "column",
      gap:           10,
      opacity: loading ? 0.5 : 1,
      transition:    "box-shadow .2s",
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.slate,
          textTransform: "uppercase", letterSpacing: ".07em",
        }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: color + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1,
        letterSpacing: "-.02em",
      }}>
        {loading ? <span className="skeleton" style={{ width: 80, height: 28, borderRadius: 4, display: "block" }} /> : value}
      </div>
      {sub && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #F1F5F9",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 12, color: C.slate, margin: "2px 0 0" }}>{subtitle}</p>}
        </div>
        {action && (
          <button onClick={action.onClick} style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, fontWeight: 600, color: C.teal,
            background: "none", border: "none", cursor: "pointer",
          }}>
            {action.label} <ChevronRight size={13} />
          </button>
        )}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function RiskPill({ level }) {
  const cfg = {
    High:    { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
    Medium:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    Low:     { bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
  }[level] || { bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {level}
    </span>
  );
}

function BurnoutPill({ level }) {
  const cfg = {
    Critical: { bg: "#FEE2E2", text: "#991B1B" },
    High:     { bg: "#FFEDD5", text: "#9A3412" },
    Moderate: { bg: "#FEF3C7", text: "#92400E" },
    Healthy:  { bg: "#DCFCE7", text: "#166534" },
  }[level] || { bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      padding: "3px 9px", borderRadius: 99,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 700,
    }}>{level}</span>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────
export default function AdminDashboard({ user }) {
  const [payData,   setPayData]   = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [attData,   setAttData]   = useState(null);
  const [attrition, setAttrition] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastUpdate,setLastUpdate]= useState("");

  const year  = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pay, leave, att, atr] = await Promise.all([
        analyticsAPI.payroll({ year }),
        analyticsAPI.leave({ year }),
        analyticsAPI.attendance({ month, year }),
        analyticsAPI.attrition(),
      ]);
      setPayData(pay.data.data);
      setLeaveData(leave.data.data);
      setAttData(att.data.data);
      setAttrition(atr.data.data || []);
      setLastUpdate(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error("AdminDashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // ── Derived metrics ────────────────────────────────────
  const totalEmployees   = attrition.length || 0;
  const highRisk         = attrition.filter(a => a.risk_level === "High").length;
  const medRisk          = attrition.filter(a => a.risk_level === "Medium").length;
  const attritionPct     = totalEmployees ? ((highRisk / totalEmployees) * 100).toFixed(1) : 0;
  const attRate          = parseFloat(attData?.summary?.avg_attendance_rate || 0);

  const criticalBurnout  = useMemo(() =>
    attrition.filter(e => computeBurnoutScore(e) === "Critical").length,
    [attrition]
  );
  const burnoutPct = totalEmployees ? ((criticalBurnout / totalEmployees) * 100).toFixed(1) : 0;

  // Latest payroll total
  const latestPayroll = useMemo(() => {
    const monthly = payData?.monthly || [];
    return monthly.length ? parseFloat(monthly[monthly.length - 1]?.total_net || 0) : 0;
  }, [payData]);

  // Payroll chart data (last 6 months)
  const payrollChartData = useMemo(() => {
    return (payData?.monthly || []).slice(-6).map(m => ({
      period: m.pay_period?.slice(5),   // "MM"
      net:    parseFloat(m.total_net   || 0),
      gross:  parseFloat(m.total_gross || 0),
    }));
  }, [payData]);

  // Attendance trend (daily, last 20 days)
  const attendanceTrend = useMemo(() => {
    return (attData?.dailyTrend || []).slice(-20).map(d => ({
      date:    d.date?.slice(5),   // "MM-DD"
      present: parseInt(d.present_count || 0),
      absent:  parseInt(d.absent_count  || 0),
    }));
  }, [attData]);

  // Attrition distribution pie
  const attritionDist = useMemo(() => [
    { name: "High Risk",   value: highRisk,  color: C.red    },
    { name: "Medium Risk", value: medRisk,   color: C.amber  },
    { name: "Low Risk",    value: Math.max(0, totalEmployees - highRisk - medRisk), color: C.green },
  ].filter(d => d.value > 0), [highRisk, medRisk, totalEmployees]);

  // High-risk employee table
  const highRiskEmployees = useMemo(() =>
    [...attrition]
      .filter(e => e.risk_level === "High" || e.risk_level === "Medium")
      .sort((a, b) => parseFloat(b.attrition_probability || 0) - parseFloat(a.attrition_probability || 0))
      .slice(0, 6),
    [attrition]
  );

  // Month-over-month payroll delta
  const payrollDelta = useMemo(() => {
    const m = payData?.monthly || [];
    if (m.length < 2) return null;
    const last = parseFloat(m[m.length - 1]?.total_net || 0);
    const prev = parseFloat(m[m.length - 2]?.total_net || 0);
    return prev > 0 ? ((last - prev) / prev * 100).toFixed(1) : null;
  }, [payData]);

  // Leave breakdown bar chart
  const leaveBarData = useMemo(() =>
    (leaveData?.byType || []).filter(t => parseInt(t.total_days || 0) > 0).map(t => ({
      name: t.code || t.name?.slice(0, 8),
      days: parseFloat(t.total_days || 0),
      color: t.color_code || C.teal,
    })),
    [leaveData]
  );

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page Header ─────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>{today}</p>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: "#0F172A",
            margin: 0, letterSpacing: "-.03em", lineHeight: 1.2,
          }}>
            Welcome back, {user?.first_name || "Admin"} 👋
          </h1>
          <p style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
            Here's your workforce overview for {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: C.green,
            boxShadow: `0 0 0 3px ${C.green}30`,
          }} />
          <span style={{ fontSize: 12, color: C.slate }}>
            Updated {lastUpdate || "—"}
          </span>
          <button onClick={load} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 12px", borderRadius: 8,
            border: "1px solid #E2E8F0", background: "#fff",
            fontSize: 12, fontWeight: 600, color: "#0F172A",
            cursor: "pointer",
          }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        <KPICard
          label="Total Employees"  icon={Users}
          value={loading ? "—" : totalEmployees}
          sub="Active workforce"
          color={C.blue}  loading={loading}
        />
        <KPICard
          label="Monthly Payroll"  icon={DollarSign}
          value={loading ? "—" : fmtL(latestPayroll)}
          sub={payrollDelta !== null ? `${payrollDelta > 0 ? "+" : ""}${payrollDelta}% vs last month` : "Net disbursed"}
          subTrend={payrollDelta > 0 ? "up" : payrollDelta < 0 ? "down" : null}
          color={C.teal}   loading={loading}
        />
        <KPICard
          label="Avg Attendance"   icon={Clock}
          value={loading ? "—" : `${attRate.toFixed(1)}%`}
          sub={attRate >= 85 ? "Within healthy range" : "Below 85% threshold"}
          subTrend={attRate >= 85 ? "up" : "down"}
          color={attRate >= 85 ? C.green : C.amber}  loading={loading}
        />
        <KPICard
          label="Attrition Risk"   icon={TrendingDown}
          value={loading ? "—" : `${attritionPct}%`}
          sub={`${highRisk} high · ${medRisk} medium risk`}
          subTrend={highRisk > 2 ? "down" : "up"}
          color={highRisk > 0 ? C.red : C.green}  loading={loading}
        />
        <KPICard
          label="Burnout Critical" icon={Flame}
          value={loading ? "—" : `${burnoutPct}%`}
          sub={`${criticalBurnout} employee${criticalBurnout !== 1 ? "s" : ""} flagged`}
          subTrend={criticalBurnout > 0 ? "down" : "up"}
          color={criticalBurnout > 0 ? C.orange : C.green}  loading={loading}
        />
      </div>

      {/* ── Charts Row 1: Payroll + Attendance ───────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        <SectionCard title="Payroll Trend" subtitle={`Net vs Gross — ${year}`}>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={payrollChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminNetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.teal}   stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.teal}   stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="adminGrossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue}   stopOpacity={0.12} />
                  <stop offset="95%" stopColor={C.blue}   stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="gross" name="Gross" stroke={C.blue}  strokeWidth={1.5} fill="url(#adminGrossGrad)" />
              <Area type="monotone" dataKey="net"   name="Net"   stroke={C.teal}  strokeWidth={2.5} fill="url(#adminNetGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Attendance Trend" subtitle="Present vs Absent — last 20 days">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" name="Present" fill={C.green}  radius={[3, 3, 0, 0]} />
              <Bar dataKey="absent"  name="Absent"  fill={C.red}    radius={[3, 3, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Charts Row 2: Attrition + Leave ─────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>

        <SectionCard title="Attrition Distribution" subtitle="Current risk breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={attritionDist} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={72} innerRadius={40} paddingAngle={3}
              >
                {attritionDist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} employees`, n]} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Summary numbers */}
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
            {[
              { label: "High",   val: highRisk,                                              color: C.red   },
              { label: "Medium", val: medRisk,                                               color: C.amber },
              { label: "Low",    val: Math.max(0, totalEmployees - highRisk - medRisk),      color: C.green },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: C.slate, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Leave by Type" subtitle={`Days consumed — ${year}`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leaveBarData} layout="vertical" margin={{ left: 10, right: 30 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.slate }} width={36} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n) => [`${v} days`, "Days"]} />
              <Bar dataKey="days" name="Days" radius={[0, 5, 5, 0]}>
                {leaveBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── High-Risk Employee Table ──────────────────────── */}
      <SectionCard
        title="High-Risk Employees"
        subtitle="Employees flagged by ML attrition model — ranked by probability"
      >
        {highRiskEmployees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.slate, fontSize: 13 }}>
            <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>✅</span>
            No high-risk employees flagged this period
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Employee", "Department", "Risk Level", "Burnout", "Sick Days", "Overtime", "Action"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: C.slate,
                      textTransform: "uppercase", letterSpacing: ".05em",
                      borderBottom: "1px solid #F1F5F9", background: "#FAFAFA",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {highRiskEmployees.map((emp, i) => {
                  const burnoutLevel = computeBurnoutScore(emp);
                  const initials     = emp.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "??";
                  const avatarColor  = emp.risk_level === "High" ? "#FEE2E2" : "#FEF3C7";
                  const avatarText   = emp.risk_level === "High" ? C.red : C.amber;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #F8FAFC" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: avatarColor, color: avatarText,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{emp.full_name}</div>
                            <div style={{ fontSize: 11, color: C.slate }}>{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: C.slate }}>{emp.department}</td>
                      <td style={{ padding: "12px 14px" }}><RiskPill level={emp.risk_level} /></td>
                      <td style={{ padding: "12px 14px" }}><BurnoutPill level={burnoutLevel} /></td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#0F172A" }}>
                        {emp.sick_leave_days || 0} <span style={{ color: C.slate, fontSize: 11 }}>days</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#0F172A" }}>
                        {round(emp.total_overtime)}<span style={{ color: C.slate, fontSize: 11 }}>h</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7,
                          background: emp.risk_level === "High" ? "#FEE2E2" : "#FEF3C7",
                          color: emp.risk_level === "High" ? "#991B1B" : "#92400E",
                        }}>
                          {emp.risk_level === "High" ? "HR Review" : "Monitor"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
