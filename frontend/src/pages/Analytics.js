// ============================================================
// src/pages/Analytics.js
// ============================================================
import React, { useEffect, useState } from "react";
import { analyticsAPI } from "../services/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle, TrendingDown, Activity, Brain } from "lucide-react";

const COLORS = ["#14B8A6","#3B82F6","#A855F7","#F59E0B","#EF4444","#22C55E","#F97316"];

const RiskBadge = ({ level }) => {
  const styles = {
    High:   { bg:"var(--red-100)",   color:"#991B1B" },
    Medium: { bg:"#FEF3C7",          color:"#92400E" },
    Low:    { bg:"var(--green-100)", color:"#166534" },
  };
  const s = styles[level] || styles.Low;
  return <span className="badge" style={{ background:s.bg, color:s.color }}>{level}</span>;
};

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        padding:"10px 20px", fontWeight:600, fontSize:13,
        color: active ? "var(--teal-600)" : "var(--text-secondary)",
        borderBottom: active ? "2px solid var(--teal-500)" : "2px solid transparent",
        background:"none", cursor:"pointer", marginBottom:-1,
      }}
    >{label}</button>
  );
}

export default function Analytics() {
  const [tab, setTab]             = useState("payroll");
  const [payData, setPayData]     = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [attData, setAttData]     = useState(null);
  const [attrition, setAttrition] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAPI.payroll({ year }),
      analyticsAPI.leave({ year }),
      analyticsAPI.attendance({ month: new Date().getMonth()+1, year }),
      analyticsAPI.attrition(),
      analyticsAPI.anomalies({ pay_period: `${year}-${String(new Date().getMonth()+1).padStart(2,"0")}` }),
    ]).then(([pay, leave, att, atr, anom]) => {
      setPayData(pay.data.data);
      setLeaveData(leave.data.data);
      setAttData(att.data.data);
      setAttrition(atr.data.data || []);
      setAnomalies(anom.data.data?.anomalies || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => n ? `₹${(parseFloat(n)/1000).toFixed(1)}K` : "—";

  if (loading) return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
      {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{ height:300,borderRadius:"var(--radius-lg)" }}/>)}
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div>
        <h1 className="page-title">Analytics & Intelligence</h1>
        <p className="page-subtitle">ML-powered insights across payroll, leave, and workforce</p>
      </div>

      {/* ML Alert bar */}
      {(attrition.filter(a=>a.risk_level==="High").length > 0 || anomalies.length > 0) && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {attrition.filter(a=>a.risk_level==="High").length > 0 && (
            <div style={{ background:"var(--red-100)",borderRadius:"var(--radius-md)",padding:"14px 18px",border:"1px solid rgba(239,68,68,.2)",display:"flex",alignItems:"center",gap:12 }}>
              <TrendingDown size={20} color="#991B1B" />
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:"#991B1B" }}>Attrition Risk Alert</div>
                <div style={{ fontSize:12,color:"#991B1B" }}>
                  {attrition.filter(a=>a.risk_level==="High").length} employees flagged as High Risk
                </div>
              </div>
            </div>
          )}
          {anomalies.length > 0 && (
            <div style={{ background:"var(--orange-100)",borderRadius:"var(--radius-md)",padding:"14px 18px",border:"1px solid rgba(249,115,22,.2)",display:"flex",alignItems:"center",gap:12 }}>
              <AlertTriangle size={20} color="#9A3412" />
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:"#9A3412" }}>Salary Anomalies Detected</div>
                <div style={{ fontSize:12,color:"#9A3412" }}>{anomalies.length} anomalous payslip(s) found this month</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab nav */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ borderBottom:"1px solid var(--border)",display:"flex",padding:"0 24px" }}>
          {[
            { id:"payroll",   label:"💰 Payroll" },
            { id:"leave",     label:"🏖️ Leave" },
            { id:"attendance",label:"⏰ Attendance" },
            { id:"attrition", label:"🤖 Attrition ML" },
            { id:"anomalies", label:"🔍 Anomaly Detection" },
          ].map(t => <TabButton key={t.id} label={t.label} active={tab===t.id} onClick={()=>setTab(t.id)} />)}
        </div>

        <div style={{ padding:24 }}>

          {/* ── PAYROLL ── */}
          {tab==="payroll" && payData && (
            <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:20 }}>
                {/* Monthly trend */}
                <div>
                  <h3 className="section-title" style={{ marginBottom:16 }}>Monthly Payroll Trend — {year}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={payData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="pay_period" tick={{ fontSize:10 }} />
                      <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{ fontSize:10 }} />
                      <Tooltip formatter={(v)=>[`₹${(v/1000).toFixed(1)}K`,""]} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                      <Line type="monotone" dataKey="total_gross" name="Gross" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="total_net"   name="Net"   stroke="#14B8A6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Salary dist */}
                <div>
                  <h3 className="section-title" style={{ marginBottom:16 }}>Salary Distribution</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={payData.salaryDist} dataKey="count" nameKey="salary_band"
                        cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3}>
                        {payData.salaryDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* By Dept */}
              <div>
                <h3 className="section-title" style={{ marginBottom:16 }}>Avg Salary by Department</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={payData.byDept}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="department" tick={{ fontSize:10 }} />
                    <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{ fontSize:10 }} />
                    <Tooltip formatter={(v)=>[`₹${(v/1000).toFixed(1)}K`,""]} />
                    <Bar dataKey="avg_gross" name="Avg Gross" fill="#A855F7" radius={[4,4,0,0]} />
                    <Bar dataKey="avg_net"   name="Avg Net"   fill="#14B8A6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab==="leave" && leaveData && (
            <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
                <div>
                  <h3 className="section-title" style={{ marginBottom:16 }}>Leave by Type — {year}</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={leaveData.byType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="code" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} />
                      <Tooltip />
                      <Bar dataKey="total_days" name="Total Days" radius={[4,4,0,0]}>
                        {leaveData.byType.map((entry,i) => (
                          <Cell key={i} fill={entry.color_code || COLORS[i%COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="section-title" style={{ marginBottom:16 }}>Leave by Department</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={leaveData.byDept} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="department" tick={{ fontSize:10 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="total_days" name="Days Taken" fill="#F59E0B" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top leave takers */}
              <div>
                <h3 className="section-title" style={{ marginBottom:12 }}>Top Leave Takers</h3>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Employee</th><th>Department</th><th>Requests</th><th>Total Days</th></tr></thead>
                    <tbody>
                      {leaveData.topLeaveTakers.map((e,i)=>(
                        <tr key={i}>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <div className="avatar avatar-sm">{e.employee_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                              <div>
                                <div style={{ fontSize:13,fontWeight:500 }}>{e.employee_name}</div>
                                <div style={{ fontSize:11,color:"var(--text-muted)" }}>{e.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12 }}>{e.department}</td>
                          <td>{e.requests_count}</td>
                          <td><strong>{e.total_days_taken} days</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab==="attendance" && attData && (
            <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
                {[
                  { label:"Avg Attendance Rate", val:`${parseFloat(attData.summary?.avg_attendance_rate||0).toFixed(1)}%`, color:"var(--green-500)" },
                  { label:"Avg Work Hours/Day",  val:`${attData.summary?.avg_work_hours||0}h`, color:"var(--blue-500)" },
                  { label:"Total Overtime",       val:`${attData.summary?.total_overtime_hours||0}h`, color:"var(--purple-500)" },
                ].map(({ label,val,color })=>(
                  <div key={label} className="kpi-card">
                    <div className="kpi-accent-bar" style={{ background:color }} />
                    <div style={{ paddingLeft:12 }}>
                      <div className="kpi-label">{label}</div>
                      <div className="kpi-value" style={{ fontSize:22 }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="section-title" style={{ marginBottom:16 }}>Daily Attendance Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={d=>d?.slice(5)} tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Line type="monotone" dataKey="present_count" name="Present" stroke="#22C55E" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="absent_count"  name="Absent"  stroke="#EF4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── ATTRITION ML ── */}
          {tab==="attrition" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:"var(--accent-light)",borderRadius:"var(--radius-md)",border:"1px solid rgba(20,184,166,.2)" }}>
                <Brain size={20} color="var(--teal-600)" />
                <div>
                  <p style={{ fontWeight:700,fontSize:13,color:"var(--teal-700)" }}>ML Attrition Prediction Model</p>
                  <p style={{ fontSize:12,color:"var(--teal-600)" }}>
                    RandomForest classifier trained on attendance, salary, leave, and tenure features.
                    Predicts employees likely to leave in the next 3–6 months.
                  </p>
                </div>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
                {["High","Medium","Low"].map(lvl => {
                  const count = attrition.filter(a=>a.risk_level===lvl).length;
                  const color = lvl==="High" ? "var(--red-500)" : lvl==="Medium" ? "var(--amber-500)" : "var(--green-500)";
                  return (
                    <div key={lvl} className="kpi-card">
                      <div className="kpi-accent-bar" style={{ background:color }} />
                      <div style={{ paddingLeft:12 }}>
                        <div className="kpi-label">{lvl} Risk</div>
                        <div className="kpi-value" style={{ color }}>{count}</div>
                        <div className="kpi-sub">employees</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="table-wrapper">
                <table>
                  <thead><tr>
                    <th>Employee</th><th>Department</th><th>Tenure</th>
                    <th>Absent Days</th><th>Overtime</th><th>Risk Score</th><th>Risk Level</th>
                  </tr></thead>
                  <tbody>
                    {attrition.slice(0,20).map((emp,i)=>(
                      <tr key={i}>
                        <td>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div className="avatar avatar-sm">{emp.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                            <div>
                              <div style={{ fontSize:13,fontWeight:500 }}>{emp.full_name}</div>
                              <div style={{ fontSize:11,color:"var(--text-muted)" }}>{emp.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize:12 }}>{emp.department}</td>
                        <td style={{ fontFamily:"var(--font-mono)",fontSize:12 }}>{parseFloat(emp.years_of_service||0).toFixed(1)}y</td>
                        <td style={{ color:"var(--red-500)",fontWeight:600 }}>{emp.absent_days||0}</td>
                        <td style={{ color:"var(--purple-500)" }}>{parseFloat(emp.total_overtime||0).toFixed(0)}h</td>
                        <td>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div style={{
                              flex:1, height:6, borderRadius:99,
                              background:"var(--slate-200)", overflow:"hidden",
                            }}>
                              <div style={{
                                height:"100%", borderRadius:99,
                                width:`${(emp.attrition_probability||0)*100}%`,
                                background: emp.risk_level==="High" ? "var(--red-500)" : emp.risk_level==="Medium" ? "var(--amber-500)" : "var(--green-500)",
                              }} />
                            </div>
                            <span style={{ fontFamily:"var(--font-mono)",fontSize:11,minWidth:36 }}>
                              {((emp.attrition_probability||0)*100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td><RiskBadge level={emp.risk_level||"Low"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attrition.length===0 && (
                  <div className="empty-state"><Activity size={36} /><p>No prediction data available</p></div>
                )}
              </div>
            </div>
          )}

          {/* ── ANOMALY DETECTION ── */}
          {tab==="anomalies" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:"var(--orange-100)",borderRadius:"var(--radius-md)",border:"1px solid rgba(249,115,22,.2)" }}>
                <AlertTriangle size={20} color="#9A3412" />
                <div>
                  <p style={{ fontWeight:700,fontSize:13,color:"#9A3412" }}>Isolation Forest — Salary Anomaly Detection</p>
                  <p style={{ fontSize:12,color:"#9A3412" }}>
                    Detects statistically unusual payslips: net > gross, zero salary, excessive deductions, and unexpected spikes.
                  </p>
                </div>
              </div>

              {anomalies.length === 0 ? (
                <div className="empty-state">
                  <AlertTriangle size={40} color="var(--green-500)" />
                  <p style={{ color:"var(--green-500)",fontWeight:600 }}>✅ No anomalies detected this month</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr>
                      <th>Employee</th><th>Department</th><th>Gross Salary</th>
                      <th>Net Salary</th><th>Deductions</th><th>Anomaly Type</th>
                    </tr></thead>
                    <tbody>
                      {anomalies.map((a,i)=>(
                        <tr key={i} style={{ background:"rgba(239,68,68,.03)" }}>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <div className="avatar avatar-sm" style={{ background:"var(--red-100)",color:"var(--red-500)" }}>
                                {a.employee_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
                              </div>
                              <div>
                                <div style={{ fontSize:13,fontWeight:500 }}>{a.employee_name}</div>
                                <div style={{ fontSize:11,color:"var(--text-muted)" }}>{a.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12 }}>{a.department}</td>
                          <td style={{ fontFamily:"var(--font-mono)" }}>₹{parseFloat(a.gross_salary||0).toLocaleString("en-IN")}</td>
                          <td style={{ fontFamily:"var(--font-mono)" }}>₹{parseFloat(a.net_salary||0).toLocaleString("en-IN")}</td>
                          <td style={{ fontFamily:"var(--font-mono)",color:"var(--red-500)" }}>₹{parseFloat(a.total_deductions||0).toLocaleString("en-IN")}</td>
                          <td>
                            <span className="badge badge-danger" style={{ fontSize:10 }}>
                              {a.anomaly_type?.replace(/_/g," ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
