// ============================================================
// src/pages/Employees.js  — with working Add Employee modal
// ============================================================
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { employeeAPI, departmentAPI } from "../services/api";
import { Plus, Search, ChevronRight, X, Loader } from "lucide-react";
import toast from "react-hot-toast";

function AddEmployeeModal({ depts, onClose, onSuccess }) {
  const [form, setForm] = useState({
    employee_code: "", first_name: "", last_name: "", email: "",
    password: "Password@123", phone: "", date_of_birth: "", gender: "Male",
    department_id: "", role_id: 4, job_title: "", employment_type: "Full-time",
    date_joined: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeAPI.create(form);
      toast.success(`${form.first_name} ${form.last_name} added successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div className="card" style={{ width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto" }}>
        <div className="section-header" style={{ marginBottom:20 }}>
          <h3 className="section-title">Add New Employee</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            <div className="form-group">
              <label className="form-label">Employee Code *</label>
              <input name="employee_code" className="form-input" placeholder="e.g. EMP012" value={form.employee_code} onChange={handleChange} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Job Title *</label>
              <input name="job_title" className="form-input" placeholder="e.g. Software Engineer" value={form.job_title} onChange={handleChange} required/>
            </div>
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input name="first_name" className="form-input" placeholder="First name" value={form.first_name} onChange={handleChange} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input name="last_name" className="form-input" placeholder="Last name" value={form.last_name} onChange={handleChange} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input name="email" type="email" className="form-input" placeholder="email@company.com" value={form.email} onChange={handleChange} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input name="phone" className="form-input" placeholder="10-digit mobile" value={form.phone} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input name="date_of_birth" type="date" className="form-input" value={form.date_of_birth} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input form-select" value={form.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select name="department_id" className="form-input form-select" value={form.department_id} onChange={handleChange} required>
                <option value="">Select Department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select name="role_id" className="form-input form-select" value={form.role_id} onChange={handleChange}>
                <option value={4}>Employee</option>
                <option value={3}>Manager</option>
                <option value={2}>HR</option>
                <option value={1}>Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select name="employment_type" className="form-input form-select" value={form.employment_type} onChange={handleChange}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date Joined *</label>
              <input name="date_joined" type="date" className="form-input" value={form.date_joined} onChange={handleChange} required/>
            </div>
            <div className="form-group" style={{ gridColumn:"1 / -1" }}>
              <label className="form-label">Default Password</label>
              <input name="password" className="form-input" value={form.password} onChange={handleChange} placeholder="Default: Password@123"/>
              <span style={{ fontSize:11,color:"var(--text-muted)",marginTop:4 }}>Employee should change after first login.</span>
            </div>
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Loader size={14}/> Adding…</> : <><Plus size={14}/> Add Employee</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [depts, setDepts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [showModal, setShowModal] = useState(false);
  const LIMIT = 15;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await employeeAPI.getAll({ search, department_id: deptFilter, page, limit: LIMIT });
      setEmployees(data.data);
      setTotal(data.pagination.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { departmentAPI.getAll().then(r => setDepts(r.data.data)); }, []);
  useEffect(() => { load(); }, [search, deptFilter, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{total} total employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15}/> Add Employee
        </button>
      </div>

      <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,minWidth:220 }}>
          <Search size={14} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input className="form-input" placeholder="Search by name, email, code…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft:34 }}/>
        </div>
        <select className="form-input form-select" style={{ width:200 }}
          value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        {loading ? (
          <div className="skeleton" style={{ height:300,margin:24,borderRadius:"var(--radius-md)" }}/>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Employee</th><th>Department</th><th>Job Title</th>
                <th>Role</th><th>Joined</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div className="avatar avatar-md">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                        <div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{emp.first_name} {emp.last_name}</div>
                          <div style={{ fontSize:11,color:"var(--text-muted)" }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12 }}>{emp.department || "—"}</td>
                    <td style={{ fontSize:12,color:"var(--text-secondary)" }}>{emp.job_title || "—"}</td>
                    <td><span className="badge badge-info" style={{ textTransform:"capitalize" }}>{emp.role}</span></td>
                    <td style={{ fontSize:12,color:"var(--text-secondary)" }}>
                      {new Date(emp.date_joined).toLocaleDateString("en-IN",{ day:"numeric",month:"short",year:"numeric" })}
                    </td>
                    <td>
                      <span className={`badge ${emp.is_active ? "badge-success" : "badge-danger"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <Link to={`/employees/${emp.id}`} className="btn btn-ghost btn-sm">
                        <ChevronRight size={14}/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <div className="empty-state" style={{ padding:48 }}>
                <Search size={40}/><p>No employees found</p>
              </div>
            )}
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderTop:"1px solid var(--border)" }}>
            <span style={{ fontSize:12,color:"var(--text-secondary)" }}>
              Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}
            </span>
            <div style={{ display:"flex",gap:6 }}>
              <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddEmployeeModal depts={depts} onClose={() => setShowModal(false)} onSuccess={load}/>
      )}
    </div>
  );
}