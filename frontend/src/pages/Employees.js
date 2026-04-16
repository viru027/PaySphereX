// ============================================================
// src/pages/Employees.js
// ============================================================
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { employeeAPI, departmentAPI } from "../services/api";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [depts, setDepts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deptFilter, setDeptFilter]= useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const LIMIT = 15;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await employeeAPI.getAll({ search, department_id:deptFilter, page, limit:LIMIT });
      setEmployees(data.data);
      setTotal(data.pagination.total);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    departmentAPI.getAll().then(r => setDepts(r.data.data));
  }, []);

  useEffect(() => { load(); }, [search, deptFilter, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{total} total employees</p>
        </div>
        <Link to="/employees/new" className="btn btn-primary"><Plus size={15} /> Add Employee</Link>
      </div>

      {/* Filters */}
      <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,minWidth:220 }}>
          <Search size={14} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }} />
          <input className="form-input" placeholder="Search by name, email, code…"
            value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
            style={{ paddingLeft:34 }}
          />
        </div>
        <select className="form-input form-select" style={{ width:200 }}
          value={deptFilter} onChange={e=>{setDeptFilter(e.target.value);setPage(1);}}>
          <option value="">All Departments</option>
          {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0 }}>
        {loading ? (
          <div className="skeleton" style={{ height:300,margin:24,borderRadius:"var(--radius-md)" }} />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                <th>Employee</th><th>Department</th><th>Role</th>
                <th>Joined</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div className="avatar avatar-md">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{emp.first_name} {emp.last_name}</div>
                          <div style={{ fontSize:11,color:"var(--text-muted)" }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12 }}>{emp.department}</td>
                    <td><span className="badge badge-info" style={{ textTransform:"capitalize" }}>{emp.role}</span></td>
                    <td style={{ fontSize:12,color:"var(--text-secondary)" }}>
                      {new Date(emp.date_joined).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                    </td>
                    <td>
                      <span className={`badge ${emp.is_active?"badge-success":"badge-danger"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <Link to={`/employees/${emp.id}`} className="btn btn-ghost btn-sm">
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <div className="empty-state" style={{ padding:48 }}>
                <Search size={40} /><p>No employees found</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
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
    </div>
  );
}
