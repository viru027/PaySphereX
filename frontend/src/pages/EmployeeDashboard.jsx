// ============================================================
// EmployeeDashboard.jsx — PaySphereX Employee Personal View
// FIXED: correct API paths + correct response field names
// ============================================================
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { analyticsAPI, leaveAPI, payrollAPI } from "../services/api";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Clock, Calendar, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────
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

const LEAVE_COLORS = ["#14B8A6","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#22C55E","#F97316"];

// ── Burnout score ─────────────────────────────────────────
function computeBurnout(overtime, absentDays, avgHours) {
  const score = Math.min(100, Math.round(
    Math.min(40, parseFloat(overtime  || 0) * 0.8) +
    Math.min(20, parseFloat(absentDays || 0) * 2.5) +
    (parseFloat(avgHours || 8) > 10
      ? Math.min(15, (parseFloat(avgHours) - 8) * 3) : 0)
  ));
  const level = score >= 70 ? "Critical" : score >= 45 ? "High" : score >= 25 ? "Moderate" : "Healthy";
  return { score, level };
}

// ── Helpers ───────────────────────────────────────────────
const fmtK = n => n && parseFloat(n) > 0 ? `₹${(parseFloat(n)/1000).toFixed(1)}K` : "—";
const fmtL = n => n && parseFloat(n) > 0 ? `₹${parseFloat(n).toLocaleString("en-IN")}` : "—";
const safe = (n, d = 0) => parseFloat(n || d);

// ── Shared UI ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 8, padding: "10px 14px",
      fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.10)",
    }}>
      <p style={{ fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>
            {typeof p.value === "number" && p.value > 999
              ? `₹${(p.value/1000).toFixed(1)}K` : p.value}
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
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "20px 22px", borderTop: `3px solid ${color}`,
      display: "flex", flexDirection: "column", gap: 10,
      opacity: loading ? 0.55 : 1, transition: "box-shadow .2s",
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.slate,
          textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: color + "15",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A",
        lineHeight: 1, letterSpacing: "-.02em" }}>
        {loading
          ? <span className="skeleton" style={{ width: 90, height: 28, borderRadius: 4, display: "block" }} />
          : value}
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

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: C.slate, margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function LeaveBalanceRow({ label, used, allotted, color }) {
  const pct    = allotted > 0 ? Math.min(100, (used / allotted) * 100) : 0;
  const isHigh = pct >= 80;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{label}</span>
        <span style={{ fontSize: 12, color: isHigh ? C.red : C.slate, fontWeight: 600 }}>
          {used} / {allotted} days
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "#F1F5F9", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: isHigh ? C.red : color, transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

function BurnoutMeter({ score, level }) {
  const cfg = {
    Critical: { bar: C.red,    bg: "#FEF2F2", text: "#991B1B" },
    High:     { bar: C.orange, bg: "#FFF7ED", text: "#9A3412" },
    Moderate: { bar: C.amber,  bg: "#FFFBEB", text: "#92400E" },
    Healthy:  { bar: C.green,  bg: "#F0FDF4", text: "#166534" },
  }[level] || { bar: C.green, bg: "#F0FDF4", text: "#166534" };
  const r = 44, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      padding: 16, borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.bar}20` }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#E2E8F0" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={cfg.bar} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        <text x={50} y={47} textAnchor="middle"
          style={{ fontSize: 20, fontWeight: 800, fill: cfg.bar }}>{score}</text>
        <text x={50} y={62} textAnchor="middle"
          style={{ fontSize: 10, fill: cfg.text }}>/ 100</text>
      </svg>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <span style={{ padding: "4px 12px", borderRadius: 99,
          background: cfg.bar + "20", color: cfg.bar, fontSize: 12, fontWeight: 800 }}>
          {level}
        </span>
        <p style={{ fontSize: 11, color: cfg.text, marginTop: 6 }}>Burnout Index</p>
      </div>
    </div>
  );
}

function ActivityItem({ icon, label, detail, time, type }) {
  const bg = { approved: "#DCFCE7", rejected: "#FEE2E2", pending: "#FEF3C7", payslip: "#DBEAFE" }[type] || "#F1F5F9";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12,
      padding: "11px 0", borderBottom: "1px solid #F8FAFC" }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", margin: 0, lineHeight: 1.4 }}>{label}</p>
        {detail && <p style={{ fontSize: 11, color: C.slate, margin: "2px 0 0" }}>{detail}</p>}
      </div>
      {time && <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{time}</span>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function EmployeeDashboard({ user }) {
  const [attData,   setAttData]   = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [payData,   setPayData]   = useState([]);
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const year  = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);

    // ── 1. Attendance summary (via analyticsAPI — same as Analytics.js) ──
    try {
      const res = await analyticsAPI.attendance({ month, year });
      setAttData(res?.data?.data ?? null);
    } catch (e) {
      console.warn("Attendance API:", e.message);
    }

    // ── 2. Leave balance — CORRECT path: /api/v1/leaves/balance ──────────
    try {
      const res = await leaveAPI.getBalance();           // → /api/v1/leaves/balance
      const d   = res?.data?.data;
      setLeaveData(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn("Leave balance API:", e.message);
      setLeaveData([]);
    }

    // ── 3. My payslips — CORRECT path: /api/v1/payroll/payslips ──────────
    try {
      const res = await payrollAPI.getPayslips({ limit: 6 }); // → /api/v1/payroll/payslips
      const d   = res?.data?.data;
      setPayData(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn("Payroll API:", e.message);
      setPayData([]);
    }

    // ── 4. Leave requests — CORRECT path: /api/v1/leaves ─────────────────
    try {
      const res = await leaveAPI.getAll({ limit: 10 });   // → /api/v1/leaves
      const d   = res?.data?.data;
      setLeaveReqs(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn("Leave requests API:", e.message);
      setLeaveReqs([]);
    }

    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // ── Attendance metrics ─────────────────────────────────
  const attSummary = attData?.summary || {};
  const attRate    = safe(attSummary.avg_attendance_rate);
  const avgHours   = safe(attSummary.avg_work_hours).toFixed(1);
  const overtime   = safe(attSummary.total_overtime_hours).toFixed(1);

  const dailyTrend = useMemo(() => {
    return (attData?.dailyTrend || [])
      .slice(-14)
      .map(d => ({
        date:  (d.date || "").slice(5),
        hours: safe(d.avg_work_hours || d.work_hours || 0),
      }))
      .filter(d => d.date && d.hours > 0);
  }, [attData]);

  const { presentDays, absentDays } = useMemo(() => {
    const trend = attData?.dailyTrend || [];
    return {
      presentDays: trend.filter(d => parseInt(d.present_count || 0) > 0).length,
      absentDays:  trend.filter(d => parseInt(d.absent_count  || 0) > 0).length,
    };
  }, [attData]);

  const displayPct = attRate > 0 ? attRate.toFixed(1)
    : presentDays > 0 ? ((presentDays / (presentDays + absentDays || 1)) * 100).toFixed(1)
    : "0.0";

  const burnout = useMemo(() =>
    computeBurnout(overtime, absentDays, avgHours),
    [overtime, absentDays, avgHours]
  );

  // ── Leave balances ─────────────────────────────────────
  // Backend returns: { leave_type_name, leave_code, color_code, used, allotted, balance }
  const leaveBalances = Array.isArray(leaveData) ? leaveData : [];
  const totalUsed     = leaveBalances.reduce((s, b) => s + safe(b.used), 0);
  const totalAllotted = leaveBalances.reduce((s, b) => s + safe(b.allotted), 0);
  const totalBalance  = Math.max(0, totalAllotted - totalUsed);

  const leavePieData = useMemo(() =>
    leaveBalances
      .filter(b => safe(b.used) > 0)
      .map((b, i) => ({
        name:  b.leave_type_name || b.leave_code || `Leave ${i+1}`,
        value: safe(b.used),
        color: b.color_code || LEAVE_COLORS[i % LEAVE_COLORS.length],
      })),
    [leaveBalances]
  );

  // ── Payslips ───────────────────────────────────────────
  const payslips      = Array.isArray(payData) ? payData : [];
  const latestPayslip = payslips[0] || null;
  const netSalary     = safe(latestPayslip?.net_salary || 0);

  const salaryTrend = useMemo(() =>
    [...payslips].reverse().slice(-5).map(p => ({
      month: (p.pay_period || "").slice(5),
      net:   safe(p.net_salary || 0),
    })).filter(p => p.month && p.net > 0),
    [payslips]
  );

  // ── Recent activity ────────────────────────────────────
  const recentActivity = useMemo(() => {
    const acts = leaveReqs.slice(0, 5).map(r => ({
      icon:   r.status === "approved" ? "✅" : r.status === "rejected" ? "❌" : "⏳",
      label:  `${r.leave_type_name || r.leave_code || "Leave"} — ${r.total_days} day${r.total_days !== 1 ? "s" : ""}`,
      detail: `${(r.start_date||"").slice(0,10)} → ${(r.end_date||"").slice(0,10)} · ${r.reason||""}`,
      time:   (r.applied_on || r.created_at || "").slice(0,10),
      type:   r.status,
    }));
    if (latestPayslip) {
      acts.unshift({
        icon:   "💰",
        label:  `Payslip — ${latestPayslip.pay_period || "Latest"}`,
        detail: `Net salary: ${fmtL(netSalary)}`,
        time:   latestPayslip.pay_period || "",
        type:   "payslip",
      });
    }
    return acts.slice(0, 6);
  }, [leaveReqs, latestPayslip, netSalary]);

  const greet = new Date().getHours() < 12 ? "morning"
              : new Date().getHours() < 17 ? "afternoon" : "evening";
  const today = new Date().toLocaleDateString("en-IN",
    { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>{today}</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0,
          letterSpacing: "-.03em", lineHeight: 1.2 }}>
          Good {greet}, {user?.firstName || user?.first_name || "there"} 👋
        </h1>
        <p style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
          Here's your personal overview for{" "}
          {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        <KPICard
          label="My Attendance" icon={Clock}
          value={loading ? "—" : `${displayPct}%`}
          sub={attRate > 0 ? "This month" : `${presentDays} present · ${absentDays} absent`}
          subTrend={parseFloat(displayPct) >= 85 ? "up" : "down"}
          color={parseFloat(displayPct) >= 85 ? C.green : C.amber}
          loading={loading}
        />
        <KPICard
          label="Leave Balance" icon={Calendar}
          value={loading ? "—" : totalAllotted > 0 ? `${totalBalance} days` : "—"}
          sub={totalAllotted > 0 ? `${totalUsed} of ${totalAllotted} used` : "No balance data"}
          subTrend={totalAllotted > 0 && totalUsed / totalAllotted < 0.7 ? "up" : "flat"}
          color={C.blue}
          loading={loading}
        />
        <KPICard
          label="Net Salary" icon={DollarSign}
          value={loading ? "—" : fmtK(netSalary)}
          sub={latestPayslip?.pay_period ? `Period: ${latestPayslip.pay_period}` : "Latest payslip"}
          color={C.teal}
          loading={loading}
        />
        <KPICard
          label="Avg Work Hours" icon={Activity}
          value={loading ? "—" : `${avgHours}h`}
          sub={`${overtime}h overtime this month`}
          subTrend={parseFloat(overtime) > 20 ? "down" : "up"}
          color={parseFloat(overtime) > 20 ? C.orange : C.purple}
          loading={loading}
        />
      </div>

      {/* Work hours trend + Leave balances */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <SectionCard title="Work Hours — Last 14 Days" subtitle="Daily logged hours">
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="empHoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="hours" name="Hours"
                  stroke={C.blue} strokeWidth={2.5} fill="url(#empHoursGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 28 }}>📋</span>
              <p style={{ color: C.slate, fontSize: 13 }}>No attendance records this month</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Leave Balances" subtitle={`${year} quota`}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 32, borderRadius: 6, marginBottom: 12 }} />
            ))
          ) : leaveBalances.length > 0 ? (
            leaveBalances
              .filter(b => safe(b.allotted) > 0)
              .slice(0, 5)
              .map((b, i) => (
                <LeaveBalanceRow
                  key={i}
                  label={b.leave_type_name || b.leave_code || `Leave ${i+1}`}
                  used={safe(b.used)}
                  allotted={safe(b.allotted)}
                  color={b.color_code || LEAVE_COLORS[i % LEAVE_COLORS.length]}
                />
              ))
          ) : (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.slate, fontSize: 13 }}>
              <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>🗂️</span>
              No leave balance found for {year}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Burnout + Salary trend + Leave pie */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 240px", gap: 20 }}>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Wellbeing Score</h3>
          {loading
            ? <div className="skeleton" style={{ height: 150, borderRadius: 12 }} />
            : <BurnoutMeter score={burnout.score} level={burnout.level} />
          }
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Overtime hrs",  val: `${overtime}h`,  warn: parseFloat(overtime) > 20 },
              { label: "Absent days",   val: `${absentDays}`, warn: absentDays > 3 },
              { label: "Avg hrs / day", val: `${avgHours}h`,  warn: parseFloat(avgHours) > 10 },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.slate }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.warn ? C.red : C.green }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <SectionCard title="Net Salary Trend" subtitle="Last 5 months">
          {loading ? (
            <div className="skeleton" style={{ height: 190, borderRadius: 8 }} />
          ) : salaryTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={salaryTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="empSalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.teal} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.teal} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`}
                  tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="net" name="Net Salary"
                  stroke={C.teal} strokeWidth={2.5} fill="url(#empSalGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 28 }}>💳</span>
              <p style={{ color: C.slate, fontSize: 13 }}>No payslip data available</p>
            </div>
          )}
        </SectionCard>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Leave Breakdown</h3>
          <p style={{ fontSize: 12, color: C.slate, marginBottom: 12 }}>By type — {year}</p>
          {loading ? (
            <div className="skeleton" style={{ height: 190, borderRadius: 8 }} />
          ) : leavePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={leavePieData} dataKey="value" nameKey="name"
                  cx="50%" cy="46%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                  {leavePieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} days`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 28 }}>🏖️</span>
              <p style={{ color: C.slate, fontSize: 12, textAlign: "center" }}>No leave taken yet this year</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>Recent Activity</h3>
          <p style={{ fontSize: 12, color: C.slate, margin: "2px 0 0" }}>Leave requests and latest payslip</p>
        </div>
        <div style={{ padding: "8px 20px" }}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
            ))
          ) : recentActivity.length > 0 ? (
            recentActivity.map((act, i) => <ActivityItem key={i} {...act} />)
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: C.slate, fontSize: 13 }}>
              <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>📭</span>
              No recent activity found
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
