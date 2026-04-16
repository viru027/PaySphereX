// ============================================================
// src/pages/PayslipDetail.js
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { payrollAPI } from "../services/api";
import { ArrowLeft, Download } from "lucide-react";

const fmt = (n) => `₹${parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2})}`;

export default function PayslipDetail() {
  const { id } = useParams();
  const [ps, setPs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollAPI.getPayslips({ limit:100 })
      .then(r => setPs(r.data.data.find(p => p.id === id)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height:600,borderRadius:"var(--radius-lg)" }} />;
  if (!ps) return <div className="empty-state"><p>Payslip not found</p></div>;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24,maxWidth:800 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <Link to="/payroll" className="btn btn-ghost btn-sm"><ArrowLeft size={15}/> Back</Link>
          <h1 className="page-title" style={{ margin:0 }}>Payslip — {ps.pay_period}</h1>
        </div>
        <a href={payrollAPI.getPayslipPDFUrl(ps.id)} target="_blank" rel="noreferrer"
          className="btn btn-primary btn-sm">
          <Download size={13} /> Download PDF
        </a>
      </div>

      <div className="card">
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,paddingBottom:20,borderBottom:"1px solid var(--border)",marginBottom:20 }}>
          <div>
            <h3 style={{ fontFamily:"var(--font-display)",fontSize:20,fontWeight:800,color:"var(--navy-900)" }}>PaySphereX</h3>
            <p style={{ fontSize:12,color:"var(--text-secondary)" }}>Payslip for {ps.pay_period}</p>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:12,color:"var(--text-secondary)" }}>Employee</p>
            <p style={{ fontWeight:700 }}>{ps.employee_name}</p>
            <p style={{ fontSize:12,color:"var(--text-secondary)",fontFamily:"var(--font-mono)" }}>{ps.employee_code}</p>
            <p style={{ fontSize:12,color:"var(--text-secondary)" }}>{ps.department}</p>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
          {/* Earnings */}
          <div>
            <h4 style={{ fontSize:12,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12 }}>Earnings</h4>
            {[
              ["Basic Salary",        ps.base_salary],
              ["HRA",                 ps.hra],
              ["Transport Allowance", ps.transport_allowance],
              ["Medical Allowance",   ps.medical_allowance],
              ["Special Allowance",   ps.special_allowance],
              ["Performance Bonus",   ps.performance_bonus],
              ["Overtime Pay",        ps.overtime_pay],
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:13,color:"var(--text-secondary)" }}>{l}</span>
                <span style={{ fontSize:13,fontFamily:"var(--font-mono)" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",background:"var(--accent-light)",borderRadius:6,paddingLeft:8,paddingRight:8,marginTop:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Gross Salary</span>
              <span style={{ fontWeight:800,fontSize:13,fontFamily:"var(--font-mono)",color:"var(--teal-600)" }}>{fmt(ps.gross_salary)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 style={{ fontSize:12,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12 }}>Deductions</h4>
            {[
              ["PF (Employee)",   ps.pf_deduction],
              ["ESI",             ps.esi_deduction],
              ["Professional Tax",ps.professional_tax],
              ["Income Tax (TDS)",ps.income_tax_tds],
              ["Loan Deduction",  ps.loan_deduction],
              ["Other Deductions",ps.other_deductions],
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:13,color:"var(--text-secondary)" }}>{l}</span>
                <span style={{ fontSize:13,fontFamily:"var(--font-mono)",color:"var(--red-500)" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",background:"var(--red-100)",borderRadius:6,paddingLeft:8,paddingRight:8,marginTop:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Total Deductions</span>
              <span style={{ fontWeight:800,fontSize:13,fontFamily:"var(--font-mono)",color:"var(--red-500)" }}>{fmt(ps.total_deductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{ marginTop:24,background:"var(--navy-900)",borderRadius:"var(--radius-md)",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <p style={{ fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:4 }}>NET PAY (Take Home)</p>
            <p style={{ fontSize:11,color:"rgba(255,255,255,.4)" }}>
              {ps.days_present}/{ps.working_days} days present
            </p>
          </div>
          <p style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,color:"var(--teal-400)" }}>
            {fmt(ps.net_salary)}
          </p>
        </div>
      </div>
    </div>
  );
}
