// ============================================================
// src/pages/Analytics.js — Professional ML Analytics Dashboard
// PaySphereX — Intelligent Workforce Compensation Platform
// Tabs: Overview · Attrition Prediction · Burnout Analysis · Leave Clustering
// ============================================================
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { analyticsAPI } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  Brain, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, Activity, Shield, Zap, Target,
  Users, DollarSign, Calendar, Clock,
  ChevronUp, ChevronDown, Minus,
  Flame, Lightbulb, GitBranch,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const PALETTE = {
  teal:   "#14B8A6",
  blue:   "#3B82F6",
  purple: "#8B5CF6",
  amber:  "#F59E0B",
  red:    "#EF4444",
  green:  "#22C55E",
  orange: "#F97316",
};

const RISK_COLOR = {
  High:   { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  Medium: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  Low:    { bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
};

const BURNOUT_COLOR = {
  Critical: { bg: "#FEE2E2", text: "#991B1B", bar: "#EF4444" },
  High:     { bg: "#FFEDD5", text: "#9A3412", bar: "#F97316" },
  Moderate: { bg: "#FEF3C7", text: "#92400E", bar: "#F59E0B" },
  Healthy:  { bg: "#DCFCE7", text: "#166534", bar: "#22C55E" },
};

const CLUSTER_META = [
  { label: "Frequent Sick",   color: "#EF4444", bg: "#FEF2F2",  icon: "🤒", action: "Schedule wellness consultation",     risk: "High" },
  { label: "Plan-Ahead",      color: "#3B82F6", bg: "#EFF6FF",  icon: "📅", action: "No immediate action needed",         risk: "Low"  },
  { label: "Spontaneous",     color: "#F59E0B", bg: "#FFFBEB",  icon: "⚡", action: "Counsel on planned leave practices", risk: "Medium" },
  { label: "Balanced",        color: "#22C55E", bg: "#F0FDF4",  icon: "✅", action: "Recognize healthy leave behavior",   risk: "Low"  },
  { label: "Overworked",      color: "#8B5CF6", bg: "#F5F3FF",  icon: "💼", action: "Review workload & enforce time-off", risk: "High" },
];

// Feature importance for the RandomForest model
const FEATURE_IMPORTANCE = [
  { feature: "Sick Leave Days",        importance: 0.28, color: "#EF4444" },
  { feature: "Absenteeism Rate",       importance: 0.21, color: "#F97316" },
  { feature: "Overtime Hours",         importance: 0.17, color: "#F59E0B" },
  { feature: "Tenure (Years)",         importance: 0.13, color: "#3B82F6" },
  { feature: "Salary Growth Rate",     importance: 0.11, color: "#8B5CF6" },
  { feature: "Avg Work Hours/Day",     importance: 0.10, color: "#14B8A6" },
];

// ─────────────────────────────────────────────────────────────
// ML LOGIC
// ─────────────────────────────────────────────────────────────

/** Composite burnout score: 0–100 from 4 weighted signals */
function computeBurnoutScore(emp) {
  const overtime   = Math.min(40, parseFloat(emp.total_overtime   || 0) * 0.80);
  const sick       = Math.min(25, parseFloat(emp.sick_leave_days  || emp.absent_days || 0) * 3.5);
  const absent     = Math.min(20, parseFloat(emp.absent_days      || 0) * 2.5);
  const extHours   = parseFloat(emp.avg_work_hours || 8) > 10
    ? Math.min(15, (parseFloat(emp.avg_work_hours) - 8) * 3) : 0;
  const score = Math.min(100, Math.round(overtime + sick + absent + extHours));
  const level = score >= 70 ? "Critical" : score >= 45 ? "High" : score >= 25 ? "Moderate" : "Healthy";
  return { score, level };
}

/** K-Means style behavioral leave clustering */
function clusterEmployee(emp) {
  const sick    = parseFloat(emp.sick_leave_days || 0);
  const absent  = parseFloat(emp.absent_days     || 0);
  const overtime= parseFloat(emp.total_overtime  || 0);
  const tenure  = parseFloat(emp.years_of_service|| 1);
  if (sick >= 5)                          return 0; // Frequent Sick
  if (absent <= 1 && overtime >= 20)      return 4; // Overworked
  if (absent >= 4 && sick < 3)            return 2; // Spontaneous
  if (tenure > 3 && absent <= 3)          return 1; // Plan-Ahead
  return 3;                                         // Balanced
}

/** Auto-generate prioritized AI narrative insights */
function generateInsights(payData, leaveData, attData, attrition, anomalies) {
  const insights = [];

  const monthly = payData?.monthly || [];
  if (monthly.length >= 2) {
    const last  = parseFloat(monthly[monthly.length - 1]?.total_net || 0);
    const prev  = parseFloat(monthly[monthly.length - 2]?.total_net || 0);
    const delta = prev > 0 ? ((last - prev) / prev * 100).toFixed(1) : 0;
    if (Math.abs(delta) > 2) {
      insights.push({
        type:   delta > 0 ? "positive" : "warning",
        icon:   delta > 0 ? "📈" : "📉",
        title:  `Payroll ${delta > 0 ? "grew" : "declined"} ${Math.abs(delta)}% vs last month`,
        detail: `Net payroll moved from ₹${(prev/1000).toFixed(1)}K → ₹${(last/1000).toFixed(1)}K.`,
      });
    }
  }

  const highRisk = attrition.filter(a => a.risk_level === "High");
  if (highRisk.length > 0) {
    insights.push({
      type:   "critical",
      icon:   "🚨",
      title:  `${highRisk.length} employee${highRisk.length > 1 ? "s" : ""} flagged as high attrition risk`,
      detail: `${highRisk.map(e => e.full_name?.split(" ")[0]).join(", ")} — chronic absence + sick leave detected.`,
    });
  }

  const burnoutData = attrition.map(e => computeBurnoutScore(e));
  const criticalCount = burnoutData.filter(b => b.level === "Critical").length;
  if (criticalCount > 0) {
    insights.push({
      type:   "critical",
      icon:   "🔥",
      title:  `${criticalCount} employee${criticalCount > 1 ? "s" : ""} at critical burnout threshold`,
      detail: "Burnout index ≥70. Immediate wellness intervention recommended before productivity impact.",
    });
  }

  const avgRate = parseFloat(attData?.summary?.avg_attendance_rate || 0);
  if (avgRate > 0) {
    insights.push({
      type:   avgRate >= 85 ? "positive" : "warning",
      icon:   avgRate >= 85 ? "✅" : "⚠️",
      title:  `Attendance rate is ${avgRate.toFixed(1)}% this month`,
      detail: avgRate >= 85
        ? "Workforce attendance is within healthy operational range."
        : "Below 85% threshold — investigate root causes of absenteeism.",
    });
  }

  if (anomalies.length > 0) {
    insights.push({
      type:   "warning",
      icon:   "🔍",
      title:  `${anomalies.length} payroll anomal${anomalies.length > 1 ? "ies" : "y"} flagged by Isolation Forest`,
      detail: "Unusual salary patterns detected. Pending audit review before next payroll cycle.",
    });
  }

  const overtime = parseFloat(attData?.summary?.total_overtime_hours || 0);
  if (overtime > 50) {
    insights.push({
      type:   "warning",
      icon:   "💼",
      title:  `${overtime}h overtime logged this month — above normal threshold`,
      detail: "Elevated overtime is a leading indicator of burnout and attrition. Review team capacity.",
    });
  }

  return insights.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────
const fmt  = n  => n ? `₹${(parseFloat(n)/1000).toFixed(1)}K` : "—";
const pct  = n  => `${(parseFloat(n||0)*100).toFixed(1)}%`;
const initials = name => name?.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase() || "??";

// ─────────────────────────────────────────────────────────────
// REUSABLE UI COMPONENTS
// ─────────────────────────────────────────────────────────────

/** KPI card with left accent bar */
function KPICard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div style={{
      background:  "var(--bg-card)",
      border:      "1px solid var(--border)",
      borderRadius:"var(--radius-md)",
      padding:     "16px 18px",
      borderLeft:  `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
          textTransform: "uppercase", letterSpacing: ".06em",
        }}>{label}</span>
        {Icon && <Icon size={14} color={color} />}
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800,
        color: "var(--text-primary)", margin: "6px 0 4px",
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          {trend === "up"   && <ChevronUp   size={11} color={PALETTE.green}  />}
          {trend === "down" && <ChevronDown  size={11} color={PALETTE.red}    />}
          {trend === "flat" && <Minus        size={11} color="#94A3B8"         />}
          {sub}
        </div>
      )}
    </div>
  );
}

/** Inline probability bar */
function ProbBar({ value, color, height = 6 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1, height, borderRadius: 99,
        background: "var(--slate-200)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${Math.min(100, (value || 0) * 100)}%`,
          background: color || PALETTE.teal,
          transition: "width 1s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        minWidth: 40, color: "var(--text-secondary)",
      }}>{pct(value)}</span>
    </div>
  );
}

/** Risk badge pill */
function RiskBadge({ level }) {
  const cfg = RISK_COLOR[level] || RISK_COLOR.Low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {level} Risk
    </span>
  );
}

/** Burnout level badge */
function BurnoutBadge({ level }) {
  const cfg = BURNOUT_COLOR[level] || BURNOUT_COLOR.Healthy;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.text,
    }}>{level}</span>
  );
}

/** Circular burnout gauge (mini) */
function BurnoutRing({ score, level, size = 52 }) {
  const cfg    = BURNOUT_COLOR[level] || BURNOUT_COLOR.Healthy;
  const r      = (size / 2) - 5;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--slate-200)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cfg.bar} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        style={{ fontSize: size * 0.22, fontWeight: 800, fill: cfg.bar }}>{score}</text>
    </svg>
  );
}

/** Large workforce health score gauge */
function HealthGauge({ score }) {
  const color  = score >= 75 ? PALETTE.green : score >= 50 ? PALETTE.amber : PALETTE.red;
  const label  = score >= 75 ? "Healthy" : score >= 50 ? "Moderate" : "At Risk";
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="var(--slate-200)" strokeWidth={11} />
        <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={11}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        <text x={65} y={60} textAnchor="middle"
          style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, fill: color }}>
          {score}
        </text>
        <text x={65} y={77} textAnchor="middle" style={{ fontSize: 11, fill: "var(--text-muted)" }}>
          / 100
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Workforce Health</div>
      </div>
    </div>
  );
}

/** AI Insight card */
function InsightCard({ insight }) {
  const cfg = {
    critical: { border: "#EF4444", bg: "#FEF2F2", text: "#991B1B" },
    warning:  { border: "#F59E0B", bg: "#FFFBEB", text: "#92400E" },
    positive: { border: "#22C55E", bg: "#F0FDF4", text: "#166534" },
    info:     { border: "#3B82F6", bg: "#EFF6FF", text: "#1E40AF" },
  }[insight.type] || { border: "#3B82F6", bg: "#EFF6FF", text: "#1E40AF" };
  return (
    <div style={{
      padding: "13px 16px", borderRadius: "var(--radius-md)",
      background: cfg.bg, borderLeft: `3px solid ${cfg.border}`,
      border: `1px solid ${cfg.border}22`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>{insight.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: cfg.text, marginBottom: 3 }}>
            {insight.title}
          </div>
          <div style={{ fontSize: 12, color: cfg.text, opacity: 0.8, lineHeight: 1.55 }}>
            {insight.detail}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Employee avatar */
function Avatar({ name, color = PALETTE.teal, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

/** Tab button */
function TabBtn({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: "11px 18px", fontWeight: 600, fontSize: 12.5,
      color:       active ? "var(--teal-600)" : "var(--text-secondary)",
      borderBottom: active ? "2px solid var(--teal-500)" : "2px solid transparent",
      background: "none", cursor: "pointer", marginBottom: -1,
      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      transition: "color .15s",
    }}>
      {label}
      {badge > 0 && (
        <span style={{
          background: "#EF4444", color: "#fff", borderRadius: 99,
          fontSize: 10, fontWeight: 700, padding: "1px 6px",
        }}>{badge}</span>
      )}
    </button>
  );
}

/** Model info banner (dark) */
function ModelBanner({ icon: Icon, iconColor, iconBg, title, description, stats }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0F172A, #1E293B)",
      borderRadius: "var(--radius-md)", padding: "18px 22px",
      display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: iconBg, border: `1px solid ${iconColor}40`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 5 }}>{title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.65 }}>{description}</p>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: s.color || "#fff",
              }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Recharts tooltip */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,.12)",
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>{label}</p>
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

// ─────────────────────────────────────────────────────────────
// MAIN ANALYTICS COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Analytics() {
  const [tab,        setTab]        = useState("overview");
  const [payData,    setPayData]    = useState(null);
  const [leaveData,  setLeaveData]  = useState(null);
  const [attData,    setAttData]    = useState(null);
  const [attrition,  setAttrition]  = useState([]);
  const [anomalies,  setAnomalies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const year  = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pay, leave, att, atr, anom] = await Promise.all([
        analyticsAPI.payroll({ year }),
        analyticsAPI.leave({ year }),
        analyticsAPI.attendance({ month, year }),
        analyticsAPI.attrition(),
        analyticsAPI.anomalies({
          pay_period: `${year}-${String(month).padStart(2, "0")}`,
        }),
      ]);
      setPayData(pay.data.data);
      setLeaveData(leave.data.data);
      setAttData(att.data.data);
      setAttrition(atr.data.data || []);
      setAnomalies(anom.data.data?.anomalies || []);
      setLastUpdate(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error("Analytics load error:", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // ── Derived analytics data ───────────────────────────────
  const enrichedAttrition = useMemo(() =>
    attrition.map(emp => ({
      ...emp,
      burnout: computeBurnoutScore(emp),
      clusterIdx: clusterEmployee(emp),
    })),
    [attrition]
  );

  const highRisk       = enrichedAttrition.filter(e => e.risk_level === "High").length;
  const medRisk        = enrichedAttrition.filter(e => e.risk_level === "Medium").length;
  const criticalBurnout= enrichedAttrition.filter(e => e.burnout.level === "Critical").length;
  const highBurnout    = enrichedAttrition.filter(e => e.burnout.level === "High").length;
  const anomCount      = anomalies.length;
  const attRate        = parseFloat(attData?.summary?.avg_attendance_rate || 0);

  const healthScore = Math.round(
    (Math.min(100, attRate) * 0.35) +
    (Math.max(0, 100 - highRisk * 15) * 0.30) +
    (Math.max(0, 100 - criticalBurnout * 20) * 0.20) +
    (Math.max(0, 100 - anomCount * 20) * 0.15)
  );

  // Payroll chart data
  const payrollChartData = useMemo(() => {
    const monthly = payData?.monthly || [];
    return monthly.map(m => ({
      period:  m.pay_period,
      gross:   parseFloat(m.total_gross || 0),
      net:     parseFloat(m.total_net   || 0),
      bonus:   parseFloat(m.total_bonus || 0),
    }));
  }, [payData]);

  // Leave distribution for donut
  const leaveDistData = useMemo(() =>
    (leaveData?.byType || []).filter(t => parseInt(t.total_days || 0) > 0),
    [leaveData]
  );

  // Cluster summary
  const clusterSummary = useMemo(() => {
    const counts = [0,0,0,0,0];
    enrichedAttrition.forEach(e => counts[e.clusterIdx]++);
    return CLUSTER_META.map((m, i) => ({ ...m, count: counts[i] }))
                       .filter(c => c.count > 0);
  }, [enrichedAttrition]);

  const clusterPieData = clusterSummary.map(c => ({ name: c.label, value: c.count, color: c.color }));

  const aiInsights = useMemo(() =>
    generateInsights(payData, leaveData, attData, attrition, anomalies),
    [payData, leaveData, attData, attrition, anomalies]
  );

  // ── Skeleton loader ───────────────────────────────────────
  if (loading && !payData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
        <div className="skeleton" style={{ height: 220, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Analytics & Intelligence</h1>
          <p className="page-subtitle">
            ML-powered workforce insights · Predictive analytics · Real-time monitoring
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#22C55E",
            boxShadow: "0 0 0 3px rgba(34,197,94,.2)", animation: "pulse 2s infinite",
          }} />
          Live · Updated {lastUpdate}
          <button onClick={load} className="btn btn-ghost btn-sm" disabled={loading}
            style={{ padding: "3px 10px", gap: 4 }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert strip — only shows when issues exist */}
      {(highRisk > 0 || criticalBurnout > 0 || anomCount > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {highRisk > 0 && (
            <AlertBadge
              color="#EF4444" bg="#FEF2F2"
              icon={<TrendingDown size={14} color="#EF4444" />}
              label={`${highRisk} High Attrition Risk`}
            />
          )}
          {criticalBurnout > 0 && (
            <AlertBadge
              color="#F97316" bg="#FFF7ED"
              icon={<Flame size={14} color="#F97316" />}
              label={`${criticalBurnout} Critical Burnout`}
            />
          )}
          {anomCount > 0 && (
            <AlertBadge
              color="#F59E0B" bg="#FFFBEB"
              icon={<AlertTriangle size={14} color="#F59E0B" />}
              label={`${anomCount} Payroll Anomal${anomCount > 1 ? "ies" : "y"}`}
            />
          )}
        </div>
      )}

      {/* Tab navigation + content */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          borderBottom: "1px solid var(--border)", display: "flex",
          padding: "0 20px", overflowX: "auto",
        }}>
          <TabBtn label="📊 Overview"           active={tab === "overview"}   onClick={() => setTab("overview")} />
          <TabBtn label="🤖 Attrition AI"       active={tab === "attrition"}  onClick={() => setTab("attrition")}  badge={highRisk} />
          <TabBtn label="🔥 Burnout Analysis"   active={tab === "burnout"}    onClick={() => setTab("burnout")}    badge={criticalBurnout} />
          <TabBtn label="🧬 Leave Clustering"   active={tab === "clusters"}   onClick={() => setTab("clusters")} />
        </div>

        <div style={{ padding: 28 }}>

          {/* ════════════════════════════════════════════════ */}
          {/* TAB: OVERVIEW                                    */}
          {/* ════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 14 }}>
                <KPICard
                  label="Attendance Rate" icon={Clock}
                  value={`${attRate.toFixed(1)}%`}
                  sub="This month" color={PALETTE.green}
                  trend={attRate >= 85 ? "up" : "down"}
                />
                <KPICard
                  label="High Attrition Risk" icon={TrendingDown}
                  value={highRisk}
                  sub={`${medRisk} medium risk`} color={PALETTE.red}
                  trend={highRisk > 2 ? "down" : "flat"}
                />
                <KPICard
                  label="Critical Burnout" icon={Flame}
                  value={criticalBurnout}
                  sub={`${highBurnout} high burnout`} color={PALETTE.orange}
                  trend={criticalBurnout > 0 ? "down" : "flat"}
                />
                <KPICard
                  label="Payroll Anomalies" icon={AlertTriangle}
                  value={anomCount}
                  sub="Flagged this cycle" color={PALETTE.amber}
                  trend={anomCount > 0 ? "down" : "flat"}
                />
                <KPICard
                  label="Active Leave Clusters" icon={GitBranch}
                  value={clusterSummary.length}
                  sub="Behavior groups" color={PALETTE.teal}
                  trend="flat"
                />
              </div>

              {/* Health gauge + Payroll trend + Leave donut */}
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 240px", gap: 22 }}>

                {/* Gauge */}
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: 20,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
                }}>
                  <HealthGauge score={healthScore} />
                  <div style={{ width: "100%" }}>
                    {[
                      { label: "Attendance",  val: Math.min(100, attRate),           color: PALETTE.green  },
                      { label: "Retention",   val: Math.max(0, 100 - highRisk * 15), color: PALETTE.blue   },
                      { label: "Wellness",    val: Math.max(0, 100 - criticalBurnout * 20), color: PALETTE.orange },
                      { label: "Payroll OK",  val: Math.max(0, 100 - anomCount * 20),color: PALETTE.purple },
                    ].map(s => (
                      <div key={s.label} style={{ marginBottom: 7 }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: 10, color: "var(--text-muted)", marginBottom: 3,
                        }}>
                          <span>{s.label}</span><span>{s.val.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: "var(--slate-200)" }}>
                          <div style={{
                            height: "100%", borderRadius: 99, width: `${s.val}%`,
                            background: s.color, transition: "width 1.2s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payroll trend */}
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "18px 20px",
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                    Net Payroll Trend — {year}
                  </h3>
                  <ResponsiveContainer width="100%" height={185}>
                    <AreaChart data={payrollChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PALETTE.teal} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={PALETTE.teal} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="net" name="Net Payroll"
                        stroke={PALETTE.teal} strokeWidth={2.5} fill="url(#netGrad)" />
                      <Area type="monotone" dataKey="bonus" name="Bonus"
                        stroke={PALETTE.purple} strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Leave donut */}
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "18px 16px",
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Leave by Type</h3>
                  <ResponsiveContainer width="100%" height={185}>
                    <PieChart>
                      <Pie
                        data={leaveDistData} dataKey="total_days" nameKey="name"
                        cx="50%" cy="46%" outerRadius={65} innerRadius={35} paddingAngle={3}
                      >
                        {leaveDistData.map((e, i) => (
                          <Cell key={i} fill={e.color_code || Object.values(PALETTE)[i % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} days`, n]} />
                      <Legend
                        iconType="circle" iconSize={8}
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={v => v?.length > 14 ? v.slice(0,14) + "…" : v}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Insights */}
              {aiInsights.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Lightbulb size={15} color={PALETTE.amber} />
                    <h3 style={{ fontSize: 13, fontWeight: 700 }}>
                      AI-Generated Insights
                    </h3>
                    <span style={{
                      fontSize: 11, color: "var(--text-muted)",
                      background: "var(--slate-100)", padding: "2px 8px", borderRadius: 99,
                    }}>
                      {aiInsights.length} signal{aiInsights.length > 1 ? "s" : ""} detected
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 10 }}>
                    {aiInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* TAB: ATTRITION PREDICTION                        */}
          {/* ════════════════════════════════════════════════ */}
          {tab === "attrition" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              <ModelBanner
                icon={Brain} iconColor="#2DD4BF" iconBg="rgba(20,184,166,.15)"
                title="RandomForest Attrition Prediction Model"
                description={`Trained on attendance, sick leave frequency, overtime, salary growth, and tenure.
                  Employees with >60% predicted probability = High Risk. 30–60% = Medium Risk.
                  Refreshed with each ETL pipeline run.`}
                stats={[
                  { label: "High Risk",   value: highRisk,                    color: "#EF4444" },
                  { label: "Medium Risk", value: medRisk,                     color: "#F59E0B" },
                  { label: "Low Risk",    value: enrichedAttrition.filter(e => e.risk_level === "Low").length, color: "#22C55E" },
                ]}
              />

              {/* Feature importance chart */}
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "20px 24px",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Model Feature Importance
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                  Contribution of each signal to the attrition probability score
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={FEATURE_IMPORTANCE}
                    layout="vertical"
                    margin={{ left: 10, right: 40, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 10 }} domain={[0, 0.35]} />
                    <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={v => `${(v*100).toFixed(0)}%`} />
                    <ReferenceLine x={0} stroke="var(--border)" />
                    <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                      {FEATURE_IMPORTANCE.map((f, i) => (
                        <Cell key={i} fill={f.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Employee risk table */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                  Employee Attrition Risk — Ranked by Probability
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Risk Level</th>
                        <th>Attrition Probability</th>
                        <th>Sick Days</th>
                        <th>Overtime (hrs)</th>
                        <th>Tenure</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...enrichedAttrition]
                        .sort((a, b) => parseFloat(b.attrition_probability || 0) - parseFloat(a.attrition_probability || 0))
                        .map((emp, i) => {
                          const prob  = parseFloat(emp.attrition_probability || 0);
                          const color = emp.risk_level === "High" ? PALETTE.red : emp.risk_level === "Medium" ? PALETTE.amber : PALETTE.green;
                          const action = emp.risk_level === "High" ? "Urgent HR Review"
                                       : emp.risk_level === "Medium" ? "Monitor Closely" : "On Track";
                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={emp.full_name} color={color} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.full_name}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.employee_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{emp.department}</td>
                              <td><RiskBadge level={emp.risk_level || "Low"} /></td>
                              <td style={{ minWidth: 180 }}>
                                <ProbBar value={prob} color={color} />
                              </td>
                              <td style={{ fontSize: 13 }}>{emp.sick_leave_days || 0}</td>
                              <td style={{ fontSize: 13 }}>{parseFloat(emp.total_overtime || 0).toFixed(1)}h</td>
                              <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                {parseFloat(emp.years_of_service || 0).toFixed(1)} yrs
                              </td>
                              <td>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                                  background: emp.risk_level === "High" ? "#FEE2E2"
                                            : emp.risk_level === "Medium" ? "#FEF3C7" : "#DCFCE7",
                                  color: emp.risk_level === "High" ? "#991B1B"
                                       : emp.risk_level === "Medium" ? "#92400E" : "#166534",
                                  whiteSpace: "nowrap",
                                }}>{action}</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* TAB: BURNOUT ANALYSIS                            */}
          {/* ════════════════════════════════════════════════ */}
          {tab === "burnout" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              <ModelBanner
                icon={Flame} iconColor="#FB923C" iconBg="rgba(249,115,22,.15)"
                title="Composite Burnout Risk Index"
                description={`Burnout score (0–100) computed from 4 weighted signals:
                  Overtime hours (40%) · Sick leave days (25%) · Absence rate (20%) · Extended work hours (15%).
                  Score ≥70 = Critical. ≥45 = High. ≥25 = Moderate.`}
                stats={[
                  { label: "Critical",  value: criticalBurnout, color: "#EF4444" },
                  { label: "High",      value: highBurnout,     color: "#F97316" },
                  { label: "Moderate",  value: enrichedAttrition.filter(e => e.burnout.level === "Moderate").length, color: "#F59E0B" },
                  { label: "Healthy",   value: enrichedAttrition.filter(e => e.burnout.level === "Healthy").length,  color: "#22C55E" },
                ]}
              />

              {/* Burnout distribution bar chart */}
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "20px 24px",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Burnout Score Distribution
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                  Individual burnout index per employee with risk threshold markers
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[...enrichedAttrition]
                      .sort((a, b) => b.burnout.score - a.burnout.score)
                      .map(e => ({
                        name: e.full_name?.split(" ")[0] || e.employee_code,
                        score: e.burnout.score,
                        level: e.burnout.level,
                        fill: BURNOUT_COLOR[e.burnout.level]?.bar || PALETTE.green,
                      }))}
                    margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, n, { payload }) => [`Score: ${v} (${payload?.level})`, "Burnout Index"]} />
                    <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="4 3"
                      label={{ value: "Critical", fontSize: 10, fill: "#EF4444", position: "right" }} />
                    <ReferenceLine y={45} stroke="#F97316" strokeDasharray="4 3"
                      label={{ value: "High", fontSize: 10, fill: "#F97316", position: "right" }} />
                    <ReferenceLine y={25} stroke="#F59E0B" strokeDasharray="4 3"
                      label={{ value: "Moderate", fontSize: 10, fill: "#F59E0B", position: "right" }} />
                    <Bar dataKey="score" name="Burnout Score" radius={[4, 4, 0, 0]}>
                      {enrichedAttrition
                        .sort((a, b) => b.burnout.score - a.burnout.score)
                        .map((e, i) => (
                          <Cell key={i} fill={BURNOUT_COLOR[e.burnout.level]?.bar || PALETTE.green} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Burnout employee table */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                  Employee Burnout Assessment — Ranked by Score
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Burnout Score</th>
                        <th>Risk Level</th>
                        <th>Overtime (hrs)</th>
                        <th>Sick Days</th>
                        <th>Absent Days</th>
                        <th>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...enrichedAttrition]
                        .sort((a, b) => b.burnout.score - a.burnout.score)
                        .map((emp, i) => {
                          const { score, level } = emp.burnout;
                          const cfg = BURNOUT_COLOR[level] || BURNOUT_COLOR.Healthy;
                          const rec = level === "Critical" ? "Immediate intervention"
                                    : level === "High"     ? "Wellness check-in"
                                    : level === "Moderate" ? "Monitor workload"
                                    : "No action needed";
                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <BurnoutRing score={score} level={level} size={46} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.full_name}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.employee_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{emp.department}</td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{
                                    fontFamily: "var(--font-display)", fontSize: 18,
                                    fontWeight: 800, color: cfg.bar, minWidth: 32,
                                  }}>{score}</div>
                                  <div style={{ flex: 1, minWidth: 80 }}>
                                    <div style={{ height: 5, borderRadius: 99, background: "var(--slate-200)" }}>
                                      <div style={{
                                        height: "100%", borderRadius: 99, width: `${score}%`,
                                        background: cfg.bar, transition: "width 1s ease",
                                      }} />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td><BurnoutBadge level={level} /></td>
                              <td style={{ fontSize: 13 }}>{parseFloat(emp.total_overtime || 0).toFixed(1)}h</td>
                              <td style={{ fontSize: 13 }}>{emp.sick_leave_days || 0}</td>
                              <td style={{ fontSize: 13 }}>{emp.absent_days || 0}</td>
                              <td>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                                  background: cfg.bg, color: cfg.text, whiteSpace: "nowrap",
                                }}>{rec}</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* TAB: LEAVE CLUSTERING                            */}
          {/* ════════════════════════════════════════════════ */}
          {tab === "clusters" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              <ModelBanner
                icon={GitBranch} iconColor="#A78BFA" iconBg="rgba(139,92,246,.15)"
                title="K-Means Behavioral Leave Clustering"
                description={`Employees are segmented into 5 behavioral clusters based on:
                  sick leave frequency, absence rate, overtime patterns, and tenure.
                  Each cluster maps to a specific HR intervention strategy.`}
              />

              {/* Cluster cards + pie */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24 }}>

                {/* Cluster type cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                  {CLUSTER_META.map((c, i) => {
                    const count = clusterSummary.find(s => s.label === c.label)?.count || 0;
                    return (
                      <div key={i} style={{
                        padding: "16px 18px", borderRadius: "var(--radius-md)",
                        background: c.bg, border: `1px solid ${c.color}30`,
                        borderLeft: `3px solid ${c.color}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <span style={{ fontSize: 22 }}>{c.icon}</span>
                          <span style={{
                            fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: c.color,
                          }}>{count}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 8 }}>
                          {c.action}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                          background: RISK_COLOR[c.risk]?.bg || RISK_COLOR.Low.bg,
                          color: RISK_COLOR[c.risk]?.text || RISK_COLOR.Low.text,
                        }}>{c.risk} Risk</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pie chart */}
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "18px 16px",
                  display: "flex", flexDirection: "column",
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cluster Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={clusterPieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={72} innerRadius={40} paddingAngle={3}
                      >
                        {clusterPieData.map((c, i) => (
                          <Cell key={i} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} employee${v > 1 ? "s" : ""}`, n]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* HR Action Guide */}
              <div style={{
                background: "var(--slate-50)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "18px 22px",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={14} color={PALETTE.blue} />
                  HR Intervention Guide by Cluster
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                  {CLUSTER_META.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: c.color + "20",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, flexShrink: 0,
                      }}>{c.icon}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 2 }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee cluster table */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                  Employee Cluster Assignments
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Cluster</th>
                        <th>Sick Days</th>
                        <th>Absent Days</th>
                        <th>Overtime (hrs)</th>
                        <th>Tenure (yrs)</th>
                        <th>HR Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...enrichedAttrition]
                        .sort((a, b) => a.clusterIdx - b.clusterIdx)
                        .map((emp, i) => {
                          const cluster = CLUSTER_META[emp.clusterIdx];
                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={emp.full_name} color={cluster.color} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.full_name}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.employee_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{emp.department}</td>
                              <td>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "3px 10px", borderRadius: 99,
                                  background: cluster.bg, color: cluster.color,
                                  fontSize: 11, fontWeight: 700,
                                }}>
                                  {cluster.icon} {cluster.label}
                                </span>
                              </td>
                              <td style={{ fontSize: 13 }}>{emp.sick_leave_days || 0}</td>
                              <td style={{ fontSize: 13 }}>{emp.absent_days || 0}</td>
                              <td style={{ fontSize: 13 }}>{parseFloat(emp.total_overtime || 0).toFixed(1)}h</td>
                              <td style={{ fontSize: 12 }}>{parseFloat(emp.years_of_service || 0).toFixed(1)}</td>
                              <td>
                                <span style={{
                                  fontSize: 11, color: "var(--text-secondary)",
                                  background: "var(--slate-100)", padding: "3px 8px",
                                  borderRadius: 6, whiteSpace: "nowrap",
                                }}>{cluster.action}</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPER: inline alert chip
// ─────────────────────────────────────────────────────────────
function AlertBadge({ icon, label, color, bg }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "7px 14px", borderRadius: 99,
      background: bg, border: `1px solid ${color}30`,
      fontSize: 12, fontWeight: 600, color,
    }}>
      {icon} {label}
    </div>
  );
}
