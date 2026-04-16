// ============================================================
// src/pages/Leaves.js
// ============================================================
import React, { useEffect, useState } from "react";
import { leaveAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Plus, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";

const STATUS_BADGE = {
  pending:   "badge-warning",
  approved:  "badge-success",
  rejected:  "badge-danger",
  cancelled: "badge-gray",
  withdrawn: "badge-gray",
};

function ApplyLeaveModal({ types, balances, onClose, onSuccess }) {
  const [form, setForm] = useState({ leave_type_id:"", start_date:"", end_date:"", reason:"", half_day:false });
  const [loading, setLoading] = useState(false);

  const selectedBalance = balances.find(b => b.leave_type_id == form.leave_type_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leaveAPI.apply(form);
      toast.success("Leave applied successfully");
      onSuccess();
      onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
    }}>
      <div className="card" style={{ width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
        <div className="section-header">
          <h3 className="section-title">Apply for Leave</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select className="form-input form-select"
              value={form.leave_type_id}
              onChange={e => setForm({...form, leave_type_id:e.target.value})}
              required
            >
              <option value="">Select leave type</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
            {selectedBalance && (
              <p style={{ fontSize:12, color:"var(--teal-600)", fontWeight:500 }}>
                Balance: {selectedBalance.balance} days available
              </p>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input"
                value={form.start_date}
                onChange={e => setForm({...form, start_date:e.target.value})}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" className="form-input"
                value={form.end_date}
                onChange={e => setForm({...form, end_date:e.target.value})}
                min={form.start_date || new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
            <input type="checkbox" id="half_day" checked={form.half_day}
              onChange={e => setForm({...form, half_day:e.target.checked})} />
            <label htmlFor="half_day" style={{ fontSize:13, color:"var(--text-secondary)" }}>Half day</label>
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-input" rows={3}
              placeholder="Reason for leave…"
              value={form.reason}
              onChange={e => setForm({...form, reason:e.target.value})}
              style={{ resize:"vertical" }}
            />
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting…" : "Apply Leave"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Leaves() {
  const { user }                    = useAuth();
  const [requests, setRequests]     = useState([]);
  const [types, setTypes]           = useState([]);
  const [balances, setBalances]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [filter, setFilter]         = useState("all");

  const isHR = ["admin","hr","manager"].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [r, t, b] = await Promise.all([
        leaveAPI.getAll({ limit:50 }),
        leaveAPI.getTypes(),
        leaveAPI.getBalance(),
      ]);
      setRequests(r.data.data);
      setTypes(t.data.data);
      setBalances(b.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (id, status) => {
    const comment = status === "rejected" ? prompt("Rejection reason:") || "" : "";
    try {
      await leaveAPI.review(id, { status, review_comment: comment });
      toast.success(`Leave ${status}`);
      load();
    } catch {}
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await leaveAPI.cancel(id);
      toast.success("Leave cancelled");
      load();
    } catch {}
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Track and manage your leave requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Apply Leave
        </button>
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
          {balances.filter(b => b.annual_quota > 0).map(b => (
            <div key={b.leave_type_id} className="card card-sm" style={{ borderTop:`3px solid ${b.color_code}` }}>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>{b.leave_type_name}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800, color:"var(--text-primary)" }}>{b.balance}</div>
              <div style={{ fontSize:11, color:"var(--text-muted)" }}>{b.used} used / {b.allotted} allotted</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="card">
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {["all","pending","approved","rejected","cancelled"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding:"6px 14px", borderRadius:"var(--radius-md)", fontSize:12, fontWeight:600,
                background: filter===s ? "var(--accent)" : "var(--slate-100)",
                color: filter===s ? "#fff" : "var(--text-secondary)",
                border: "none", cursor:"pointer",
                textTransform:"capitalize",
              }}
            >{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height:200 }} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Calendar size={40} />
            <p>No leave requests found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id}>
                    {isHR && (
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div className="avatar avatar-sm">{req.employee_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                          <div>
                            <div style={{ fontWeight:500, fontSize:13 }}>{req.employee_name}</div>
                            <div style={{ fontSize:11, color:"var(--text-muted)" }}>{req.department}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:req.color_code }} />
                        {req.leave_type_name}
                      </span>
                    </td>
                    <td>{new Date(req.start_date).toLocaleDateString("en-IN")}</td>
                    <td>{new Date(req.end_date).toLocaleDateString("en-IN")}</td>
                    <td><strong>{req.total_days}</strong></td>
                    <td><span className={`badge ${STATUS_BADGE[req.status] || "badge-gray"}`}>{req.status}</span></td>
                    <td style={{ fontSize:12, color:"var(--text-muted)" }}>
                      {new Date(req.applied_on).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        {isHR && req.status === "pending" && (
                          <>
                            <button className="btn btn-sm" onClick={() => handleReview(req.id,"approved")}
                              style={{ background:"var(--green-100)", color:"#166534", padding:"4px 8px" }}>
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button className="btn btn-sm" onClick={() => handleReview(req.id,"rejected")}
                              style={{ background:"var(--red-100)", color:"#991B1B", padding:"4px 8px" }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {req.employee_id === user.id && req.status === "pending" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(req.id)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ApplyLeaveModal
          types={types} balances={balances}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
