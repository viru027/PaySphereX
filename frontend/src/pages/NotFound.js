// ============================================================
// src/pages/NotFound.js
// ============================================================
import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,background:"var(--bg-primary)",fontFamily:"var(--font-body)" }}>
      <div style={{ fontFamily:"var(--font-display)",fontSize:96,fontWeight:800,color:"var(--slate-200)",lineHeight:1 }}>404</div>
      <h2 style={{ fontSize:24,fontWeight:700,color:"var(--text-primary)" }}>Page not found</h2>
      <p style={{ color:"var(--text-secondary)" }}>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
    </div>
  );
}
