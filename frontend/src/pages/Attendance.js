// ============================================================
// src/pages/Attendance.js
// ============================================================
import React, { useEffect, useState } from "react";
import { attendanceAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Clock, CheckCircle2, LogIn, LogOut,
  MapPin, Monitor, Briefcase,
} from "lucide-react";

const STATUS_STYLE = {
  present:          { bg:"var(--green-100)",  color:"#166534",  label:"Present" },
  absent:           { bg:"var(--red-100)",    color:"#991B1B",  label:"Absent" },
  on_leave:         { bg:"#FEF3C7",           color:"#92400E",  label:"On Leave" },
  half_day:         { bg:"var(--blue-100)",   color:"#1E40AF",  label:"Half Day" },
  work_from_home:   { bg:"var(--purple-100)", color:"#6B21A8",  label:"WFH" },
  weekend:          { bg:"var(--slate-100)",  color:"var(--text-muted)", label:"Weekend" },
  holiday:          { bg:"var(--orange-100)", color:"#9A3412",  label:"Holiday" },
};

const LOCATION_ICONS = { office:"Briefcase", remote:"Monitor", work_from_home:"Monitor", field:"MapPin" };

function AttendanceCal({ records }) {
  // Build a map of date → record
  const map = {};
  records.forEach(r => { map[r.date?.slice(0,10)] = r; });

  const today  = new Date();
  const year   = today.getFullYear();
  const month  = today.getMonth();
  const first  = new Date(year, month, 1).getDay();      // 0=Sun
  const days   = new Date(year, month+1, 0).getDate();

  const cells = [];
  for (let i=0; i<first; i++) cells.push(null);
  for (let d=1; d<=days; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:"var(--text-muted)", padding:"4px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds  = dateStr(day);
          const rec = map[ds];
          const isToday = day === today.getDate();
          const style = rec ? STATUS_STYLE[rec.status] : {};

          return (
            <div key={ds} title={rec ? `${rec.status}${rec.work_hours ? ` · ${parseFloat(rec.work_hours).toFixed(1)}h` : ""}` : ds}
              style={{
                aspectRatio:"1",
                borderRadius:"var(--radius-sm)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:600,
                background: isToday ? "var(--teal-500)" : (style.bg || "transparent"),
                color: isToday ? "#fff" : (style.color || "var(--text-secondary)"),
                border: isToday ? "none" : "1px solid transparent",
                cursor: rec ? "pointer" : "default",
                transition:"all 150ms",
              }}
            >{day}</div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:16 }}>
        {Object.entries(STATUS_STYLE).slice(0,5).map(([k, v]) => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-secondary)" }}>
            <span style={{ width:10, height:10, borderRadius:3, background:v.bg, border:`1px solid ${v.color}30` }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Attendance() {
  const { user }                      = useAuth();
  const [records, setRecords]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [actioning, setActioning]     = useState(false);
  const [location, setLocation]       = useState("office");

  const today = new Date().toISOString().split("T")[0];
  const month = new Date().getMonth() + 1;
  const year  = new Date().getFullYear();

  const load = async () => {
    setLoading(true);
    try {
      const [recs, sum] = await Promise.all([
        attendanceAPI.getAll({ start_date:`${year}-${String(month).padStart(2,"0")}-01`, limit:31 }),
        attendanceAPI.getSummary({ month, year }),
      ]);
      setRecords(recs.data.data);
      setSummary(sum.data.data);
      const todayRec = recs.data.data.find(r => r.date?.slice(0,10) === today);
      setTodayRecord(todayRec || null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async () => {
    setActioning(true);
    try {
      await attendanceAPI.checkIn({ location });
      toast.success("✅ Checked in successfully");
      load();
    } catch {} finally { setActioning(false); }
  };

  const handleCheckOut = async () => {
    setActioning(true);
    try {
      await attendanceAPI.checkOut({});
      toast.success("👋 Checked out. Have a great evening!");
      load();
    } catch {} finally { setActioning(false); }
  };

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })
    : "--:--";

  const isCheckedIn  = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Track your daily check-in and check-out</p>
      </div>

      {/* Today's status card */}
      <div className="card" style={{
        background:"linear-gradient(135deg, var(--navy-900), var(--navy-700))",
        color:"#fff",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20 }}>
          <div>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:4 }}>Today — {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
            <div style={{ display:"flex", gap:32, marginTop:16 }}>
              <div>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>CHECK IN</p>
                <p style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700 }}>
                  {isCheckedIn ? fmtTime(todayRecord.check_in) : "--:--"}
                </p>
              </div>
              <div>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>CHECK OUT</p>
                <p style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700 }}>
                  {isCheckedOut ? fmtTime(todayRecord.check_out) : "--:--"}
                </p>
              </div>
              {isCheckedIn && !isCheckedOut && (
                <div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>WORK HOURS</p>
                  <p style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700 }}>
                    {((new Date() - new Date(todayRecord.check_in)) / 3600000).toFixed(1)}h
                  </p>
                </div>
              )}
              {isCheckedOut && (
                <div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>TOTAL HOURS</p>
                  <p style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700 }}>
                    {parseFloat(todayRecord.work_hours || 0).toFixed(1)}h
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"flex-end" }}>
            <select
              className="form-input form-select"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{ background:"rgba(255,255,255,.1)", color:"#fff", border:"1px solid rgba(255,255,255,.2)", width:160 }}
            >
              <option value="office">🏢 Office</option>
              <option value="work_from_home">🏠 Work from Home</option>
              <option value="remote">📡 Remote</option>
              <option value="field">🌍 Field</option>
            </select>

            <div style={{ display:"flex", gap:10 }}>
              {!isCheckedIn && (
                <button className="btn btn-primary" onClick={handleCheckIn} disabled={actioning}>
                  <LogIn size={15} /> Check In
                </button>
              )}
              {isCheckedIn && !isCheckedOut && (
                <button className="btn btn-secondary" onClick={handleCheckOut} disabled={actioning}
                  style={{ background:"rgba(255,255,255,.15)", color:"#fff", borderColor:"rgba(255,255,255,.2)" }}>
                  <LogOut size={15} /> Check Out
                </button>
              )}
              {isCheckedOut && (
                <div style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,.7)" }}>
                  <CheckCircle2 size={16} color="var(--teal-400)" />
                  <span style={{ fontSize:13 }}>Completed for today</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary + Calendar */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
        {/* Month summary stats */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {summary && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Days Present",  val:summary.days_present  || 0, color:"var(--green-500)"  },
                { label:"Days Absent",   val:summary.days_absent   || 0, color:"var(--red-500)"    },
                { label:"On Leave",      val:summary.days_on_leave || 0, color:"var(--amber-500)"  },
                { label:"Avg Work Hours",val:`${summary.avg_work_hours || 0}h`, color:"var(--blue-500)" },
                { label:"Total Overtime",val:`${summary.total_overtime || 0}h`, color:"var(--purple-500)"},
                { label:"Late Arrivals", val:summary.late_arrivals || 0, color:"var(--orange-500)" },
              ].map(({ label, val, color }) => (
                <div key={label} className="kpi-card">
                  <div className="kpi-accent-bar" style={{ background:color }} />
                  <div style={{ paddingLeft:12 }}>
                    <div className="kpi-label">{label}</div>
                    <div className="kpi-value" style={{ fontSize:22 }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Records table */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom:16 }}>This Month's Log</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr>
                  <th>Date</th><th>Check In</th><th>Check Out</th>
                  <th>Hours</th><th>Overtime</th><th>Location</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {records.filter(r => r.status !== "weekend").slice(0,20).map(rec => {
                    const st = STATUS_STYLE[rec.status] || {};
                    return (
                      <tr key={rec.id}>
                        <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{rec.date?.slice(0,10)}</td>
                        <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{fmtTime(rec.check_in)}</td>
                        <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{fmtTime(rec.check_out)}</td>
                        <td style={{ fontWeight:600 }}>{rec.work_hours ? `${parseFloat(rec.work_hours).toFixed(1)}h` : "—"}</td>
                        <td style={{ color:"var(--purple-500)" }}>{rec.overtime_hours > 0 ? `${rec.overtime_hours}h` : "—"}</td>
                        <td style={{ fontSize:12, color:"var(--text-secondary)", textTransform:"capitalize" }}>{rec.location || "—"}</td>
                        <td><span className="badge" style={{ background:st.bg, color:st.color }}>{st.label || rec.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {records.length === 0 && (
                <div className="empty-state"><Clock size={36} /><p>No attendance records this month</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="card" style={{ alignSelf:"start" }}>
          <h3 className="section-title" style={{ marginBottom:16 }}>
            {new Date().toLocaleDateString("en-IN",{ month:"long", year:"numeric" })}
          </h3>
          <AttendanceCal records={records} />
        </div>
      </div>
    </div>
  );
}
