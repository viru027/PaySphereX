// ============================================================
// src/pages/EmployeeDetail.js  — FIXED with error handling
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { employeeAPI } from "../services/api";
import { ArrowLeft, User, Mail, Phone, Building, Calendar, Briefcase, CreditCard } from "lucide-react";

export default function EmployeeDetail() {
  const { id }                = useParams();
  const [emp, setEmp]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    employeeAPI.getOne(id)
      .then(r => setEmp(r.data.data))
      .catch(err => {
        const msg = err?.response?.data?.message || "Failed to load employee details";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Loading
  if (loading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Link to="/employees" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14}/> Back
          </Link>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div className="skeleton" style={{ height:400, borderRadius:"var(--radius-lg)" }}/>
          <div className="skeleton" style={{ height:400, borderRadius:"var(--radius-lg)" }}/>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Link to="/employees" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14}/> Back to Employees
          </Link>
        </div>
        <div className="card" style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, marginBottom:8 }}>
            Could not load employee
          </h3>
          <p style={{ color:"var(--text-secondary)", marginBottom:24 }}>{error}</p>
          <Link to="/employees" className="btn btn-primary">← Back to Employees</Link>
        </div>
      </div>
    );
  }

  // Not found
  if (!emp) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <Link to="/employees" className="btn btn-secondary btn-sm" style={{ alignSelf:"flex-start" }}>
          <ArrowLeft size={14}/> Back
        </Link>
        <div className="empty-state"><p>Employee not found</p></div>
      </div>
    );
  }

  const infoRows = [
    { icon: User,      label: "Employee Code",   val: emp.employee_code,   mono: true },
    { icon: Mail,      label: "Email",            val: emp.email },
    { icon: Phone,     label: "Phone",            val: emp.phone || "—" },
    { icon: Building,  label: "Department",       val: emp.department || "—" },
    { icon: Briefcase, label: "Job Title",        val: emp.job_title || "—" },
    { icon: User,      label: "Role",             val: emp.role, capitalize: true },
    { icon: User,      label: "Employment Type",  val: emp.employment_type || "—" },
    { icon: Calendar,  label: "Date Joined",
      val: emp.date_joined
        ? new Date(emp.date_joined).toLocaleDateString("en-IN",{ day:"numeric", month:"long", year:"numeric" })
        : "—"
    },
  ];

  const salaryRows = [
    ["Base Salary",         emp.base_salary],
    ["HRA",                 emp.hra],
    ["Transport Allowance", emp.transport_allowance],
    ["Medical Allowance",   emp.medical_allowance],
    ["Special Allowance",   emp.special_allowance],
    ["PF (Employee)",       emp.pf_employee],
    ["Professional Tax",    emp.professional_tax],
    ["Income Tax (TDS)",    emp.income_tax_tds],
  ];

  const grossSalary = (
    parseFloat(emp.base_salary || 0) +
    parseFloat(emp.hra || 0) +
    parseFloat(emp.transport_allowance || 0) +
    parseFloat(emp.medical_allowance || 0) +
    parseFloat(emp.special_allowance || 0)
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Back button + title */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <Link to="/employees" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14}/> Back
        </Link>
        <h1 className="page-title" style={{ margin:0 }}>
          {emp.first_name} {emp.last_name}
        </h1>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* LEFT — Profile info */}
        <div className="card">
          {/* Avatar + name block */}
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24,
            paddingBottom:24, borderBottom:"1px solid var(--border)" }}>
            <div className="avatar avatar-lg">
              {emp.first_name?.[0]}{emp.last_name?.[0]}
            </div>
            <div>
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:800 }}>
                {emp.first_name} {emp.last_name}
              </h2>
              <p style={{ color:"var(--text-secondary)", fontSize:14 }}>
                {emp.job_title || "No title"}
              </p>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                <span className={`badge ${emp.is_active ? "badge-success" : "badge-danger"}`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
                <span className="badge badge-info" style={{ textTransform:"capitalize" }}>
                  {emp.role}
                </span>
                <span className="badge badge-gray">
                  {emp.employment_type}
                </span>
              </div>
            </div>
          </div>

          {/* Info rows */}
          {infoRows.map(({ icon: Icon, label, val, mono, capitalize }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ width:32, height:32, borderRadius:8,
                background:"var(--accent-light)", display:"flex",
                alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={14} color="var(--teal-600)"/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:500 }}>
                  {label}
                </div>
                <div style={{
                  fontSize:13, fontWeight:500, color:"var(--text-primary)",
                  fontFamily: mono ? "var(--font-mono)" : undefined,
                  textTransform: capitalize ? "capitalize" : undefined,
                }}>
                  {val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT — Salary structure */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {emp.base_salary ? (
            <div className="card">
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                <CreditCard size={16} color="var(--teal-600)"/>
                <h3 className="section-title">Salary Structure</h3>
              </div>

              {salaryRows.map(([label, val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between",
                  padding:"9px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:13, color:"var(--text-secondary)" }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:600, fontFamily:"var(--font-mono)" }}>
                    ₹{parseFloat(val || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}

              {/* Gross total */}
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"12px 10px", background:"var(--accent-light)",
                borderRadius:"var(--radius-sm)", marginTop:8 }}>
                <span style={{ fontWeight:700, fontSize:13 }}>Gross Salary</span>
                <span style={{ fontWeight:800, fontSize:14, fontFamily:"var(--font-mono)",
                  color:"var(--teal-600)" }}>
                  ₹{grossSalary.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Net (after deductions) */}
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"12px 10px", background:"var(--navy-900)",
                borderRadius:"var(--radius-sm)", marginTop:8 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"#fff" }}>Net Pay (Est.)</span>
                <span style={{ fontWeight:800, fontSize:14, fontFamily:"var(--font-mono)",
                  color:"var(--teal-400)" }}>
                  ₹{(grossSalary - parseFloat(emp.pf_employee||0) - parseFloat(emp.professional_tax||0) - parseFloat(emp.income_tax_tds||0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign:"center", padding:40 }}>
              <CreditCard size={36} color="var(--slate-300)"/>
              <p style={{ color:"var(--text-secondary)", marginTop:12 }}>
                No salary structure found
              </p>
              <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>
                Assign a salary structure from Payroll settings
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom:16 }}>Quick Info</h3>
            {[
              ["Gender",      emp.gender || "—"],
              ["Date of Birth", emp.date_of_birth
                ? new Date(emp.date_of_birth).toLocaleDateString("en-IN",{ day:"numeric", month:"long", year:"numeric" })
                : "—"],
              ["Department",  emp.department || "—"],
              ["Bank Account", emp.bank_account || "Not provided"],
            ].map(([label, val]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between",
                padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}