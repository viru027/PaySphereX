// ============================================================
// src/pages/Payroll.js
// ============================================================
import React, { useEffect, useState } from "react";
import { payrollAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  Play, Download, FileText, CheckCircle2,
  Clock, XCircle, DollarSign, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const RUN_STATUS = {
  completed:  { cls: "badge-success",  icon: CheckCircle2 },
  processing: { cls: "badge-warning",  icon: Clock },
  draft:      { cls: "badge-gray",     icon: Clock },
  cancelled:  { cls: "badge-danger",   icon: XCircle },
};

const PAY_STATUS = {
  paid:    "badge-success",
  pending: "badge-warning",
  failed:  "badge-danger",
  on_hold: "badge-gray",
};

const fmt = (n) => n
  ? `₹${parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  : "₹0.00";

function ProcessPayrollModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ pay_period: new Date().toISOString().slice(0,7), notes: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Process payroll for ${form.pay_period}? This will generate payslips for all active employees.`)) return;
    setLoading(true);
    try {
      const { data } = await payrollAPI.process(form);
      toast.success(`Payroll processed for ${data.data.totalEmployees} employees`);
      onSuccess();
      onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div className="card" style={{ width:"100%",maxWidth:460 }}>
        <div className="section-header">
          <h3 className="section-title">Process Payroll Run</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ background:"var(--blue-100)",borderRadius:"var(--radius-md)",padding:14,marginBottom:20 }}>
          <p style={{ fontSize:13,color:"#1E40AF",lineHeight:1.6 }}>
            ⚠️ This will calculate salaries for all active employees based on their attendance,
            leaves, and salary structures for the selected period.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div className="form-group">
            <label className="form-label">Pay Period (YYYY-MM)</label>
            <input type="month" className="form-input"
              value={form.pay_period}
              onChange={e => setForm({...form, pay_period: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={2}
              placeholder="e.g., includes Diwali bonus"
              value={form.notes}
              onChange={e => setForm({...form, notes:e.target.value})}
              style={{ resize:"vertical" }}
            />
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Processing…" : <><Play size={14} /> Run Payroll</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Payroll() {
  const [runs, setRuns]           = useState([]);
  const [payslips, setPayslips]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("runs");
  const [period, setPeriod]       = useState(new Date().toISOString().slice(0,7));

  const loadRuns    = () => payrollAPI.getRuns().then(r => setRuns(r.data.data));
  const loadPayslips= (p) => payrollAPI.getPayslips({ pay_period: p, limit:50 }).then(r => setPayslips(r.data.data));

  useEffect(() => {
    Promise.all([loadRuns(), loadPayslips(period)])
      .finally(() => setLoading(false));
  }, []);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    loadPayslips(p);
  };

  const downloadPDF = (id) => {
    const url = payrollAPI.getPayslipPDFUrl(id);
    window.open(url, "_blank");
  };

  // Chart data from runs
  const chartData = runs.slice().reverse().map(r => ({
    period:     r.pay_period,
    gross:      parseFloat(r.total_gross || 0),
    net:        parseFloat(r.total_net || 0),
    deductions: parseFloat(r.total_deductions || 0),
  }));

  if (loading) return <div className="skeleton" style={{ height:400, borderRadius:"var(--radius-lg)" }} />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Payroll Management</h1>
          <p className="page-subtitle">Process payroll runs and manage payslips</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Play size={14} /> Process Payroll
        </button>
      </div>

      {/* Summary KPIs from last run */}
      {runs[0] && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14 }}>
          {[
            { label:"Last Gross Payroll",   val: fmt(runs[0].total_gross),      icon: DollarSign, color:"#3B82F6" },
            { label:"Last Net Payroll",     val: fmt(runs[0].total_net),        icon: CheckCircle2,color:"#14B8A6" },
            { label:"Total Deductions",     val: fmt(runs[0].total_deductions), icon: XCircle,    color:"#EF4444" },
            { label:"Employees Processed",  val: "—",                           icon: Users,      color:"#A855F7" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-accent-bar" style={{ background: color }} />
              <div style={{ paddingLeft:12 }}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value" style={{ fontSize:20 }}>{val}</div>
                <div className="kpi-sub">{runs[0].pay_period}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payroll trend chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom:16 }}>Payroll Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top:5,right:10,left:0,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize:11 }} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize:11 }} />
              <Tooltip formatter={(v) => [`₹${(v/1000).toFixed(1)}K`, ""]} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="gross" name="Gross" fill="#3B82F6" radius={[4,4,0,0]} />
              <Bar dataKey="net"   name="Net"   fill="#14B8A6" radius={[4,4,0,0]} />
              <Bar dataKey="deductions" name="Deductions" fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div style={{ display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid var(--border)",paddingBottom:0 }}>
          {["runs","payslips"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding:"10px 20px", fontWeight:600, fontSize:13,
                color: activeTab===tab ? "var(--teal-600)" : "var(--text-secondary)",
                borderBottom: activeTab===tab ? "2px solid var(--teal-500)" : "2px solid transparent",
                background:"none", cursor:"pointer", textTransform:"capitalize",
                marginBottom:-1,
              }}
            >{tab === "runs" ? "Payroll Runs" : "Payslips"}</button>
          ))}
        </div>

        {/* Payroll Runs tab */}
        {activeTab === "runs" && (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Pay Period</th><th>Run Date</th><th>Gross Payroll</th>
                <th>Net Payroll</th><th>Deductions</th><th>Status</th><th>Processed By</th>
              </tr></thead>
              <tbody>
                {runs.map(run => {
                  const { cls, icon: Icon } = RUN_STATUS[run.status] || RUN_STATUS.draft;
                  return (
                    <tr key={run.id}>
                      <td><strong style={{ fontFamily:"var(--font-mono)" }}>{run.pay_period}</strong></td>
                      <td>{new Date(run.run_date).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontFamily:"var(--font-mono)" }}>{fmt(run.total_gross)}</td>
                      <td style={{ fontFamily:"var(--font-mono)" }}>{fmt(run.total_net)}</td>
                      <td style={{ fontFamily:"var(--font-mono)", color:"var(--red-500)" }}>{fmt(run.total_deductions)}</td>
                      <td><span className={`badge ${cls}`}><Icon size={10} />{" "}{run.status}</span></td>
                      <td style={{ fontSize:12, color:"var(--text-secondary)" }}>{run.processed_by_name || "System"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {runs.length === 0 && (
              <div className="empty-state"><FileText size={40} /><p>No payroll runs yet</p></div>
            )}
          </div>
        )}

        {/* Payslips tab */}
        {activeTab === "payslips" && (
          <>
            <div style={{ marginBottom:16 }}>
              <input type="month" className="form-input" style={{ width:200 }}
                value={period}
                onChange={e => handlePeriodChange(e.target.value)}
              />
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr>
                  <th>Employee</th><th>Department</th><th>Gross</th>
                  <th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {payslips.map(ps => (
                    <tr key={ps.id}>
                      <td>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div className="avatar avatar-sm">
                            {ps.employee_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div style={{ fontWeight:500,fontSize:13 }}>{ps.employee_name}</div>
                            <div style={{ fontSize:11,color:"var(--text-muted)" }}>{ps.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:12,color:"var(--text-secondary)" }}>{ps.department}</td>
                      <td style={{ fontFamily:"var(--font-mono)",fontSize:13 }}>{fmt(ps.gross_salary)}</td>
                      <td style={{ fontFamily:"var(--font-mono)",fontSize:13,color:"var(--red-500)" }}>{fmt(ps.total_deductions)}</td>
                      <td style={{ fontFamily:"var(--font-mono)",fontSize:13,fontWeight:700,color:"var(--teal-600)" }}>{fmt(ps.net_salary)}</td>
                      <td><span className={`badge ${PAY_STATUS[ps.payment_status] || "badge-gray"}`}>{ps.payment_status}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadPDF(ps.id)} title="Download PDF">
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payslips.length === 0 && (
                <div className="empty-state"><FileText size={40} /><p>No payslips for {period}</p></div>
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ProcessPayrollModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { loadRuns(); loadPayslips(period); }}
        />
      )}
    </div>
  );
}
