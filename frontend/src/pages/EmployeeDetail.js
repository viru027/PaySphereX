// ============================================================
// src/pages/EmployeeDetail.js
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { employeeAPI } from "../services/api";
import { ArrowLeft } from "lucide-react";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeAPI.getOne(id).then(r => setEmp(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height:400,borderRadius:"var(--radius-lg)" }} />;
  if (!emp) return <div className="empty-state"><p>Employee not found</p></div>;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <Link to="/employees" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Back</Link>
        <h1 className="page-title" style={{ margin:0 }}>{emp.first_name} {emp.last_name}</h1>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        <div className="card">
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:24 }}>
            <div className="avatar avatar-lg">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
            <div>
              <h2 style={{ fontFamily:"var(--font-display)",fontSize:20,fontWeight:800 }}>{emp.first_name} {emp.last_name}</h2>
              <p style={{ color:"var(--text-secondary)" }}>{emp.job_title}</p>
              <div style={{ display:"flex",gap:6,marginTop:6 }}>
                <span className={`badge ${emp.is_active?"badge-success":"badge-danger"}`}>{emp.is_active?"Active":"Inactive"}</span>
                <span className="badge badge-info" style={{ textTransform:"capitalize" }}>{emp.role}</span>
              </div>
            </div>
          </div>

          {[
            ["Employee Code", emp.employee_code],
            ["Email",         emp.email],
            ["Phone",         emp.phone||"—"],
            ["Department",    emp.department],
            ["Employment Type",emp.employment_type],
            ["Date Joined",   new Date(emp.date_joined).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})],
          ].map(([label,val])=>(
            <div key={label} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontSize:12,color:"var(--text-secondary)",fontWeight:500 }}>{label}</span>
              <span style={{ fontSize:13,fontWeight:500,fontFamily:label==="Employee Code"?"var(--font-mono)":undefined }}>{val}</span>
            </div>
          ))}
        </div>

        {emp.base_salary && (
          <div className="card">
            <h3 className="section-title" style={{ marginBottom:16 }}>Salary Structure</h3>
            {[
              ["Base Salary",          emp.base_salary],
              ["HRA",                  emp.hra],
              ["Transport Allowance",  emp.transport_allowance],
              ["Medical Allowance",    emp.medical_allowance],
              ["Special Allowance",    emp.special_allowance],
              ["PF (Employee)",        emp.pf_employee],
              ["Income Tax TDS",       emp.income_tax_tds],
            ].map(([label,val])=>(
              <div key={label} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:12,color:"var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize:13,fontWeight:600,fontFamily:"var(--font-mono)" }}>
                  ₹{parseFloat(val||0).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
