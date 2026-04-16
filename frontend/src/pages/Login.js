// ============================================================
// src/pages/Login.js
// ============================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Globe, Eye, EyeOff, Loader } from "lucide-react";

export default function Login() {
  const { login }     = useAuth();
  const navigate      = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "var(--font-body)",
    }}>
      {/* Left — branding panel */}
      <div style={{
        background: "var(--navy-900)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        {[120, 200, 300].map((size, i) => (
          <div key={i} style={{
            position: "absolute",
            width: size, height: size,
            borderRadius: "50%",
            border: "1px solid rgba(45,212,191,.15)",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            animation: `spin ${8 + i * 4}s linear infinite`,
          }} />
        ))}

        <div style={{ position: "relative", textAlign: "center", color: "#fff", maxWidth: 380 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
            background: "linear-gradient(135deg,var(--teal-500),var(--blue-500))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 16px 48px rgba(20,184,166,.4)",
          }}>
            <Globe size={32} color="#fff" strokeWidth={2} />
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800,
            background: "linear-gradient(135deg,#fff,rgba(255,255,255,.6))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 12,
          }}>
            PaySphereX
          </h1>

          <p style={{ color: "rgba(255,255,255,.55)", lineHeight: 1.7, fontSize: 14 }}>
            Intelligent Workforce Compensation &amp; Leave Analytics Platform
          </p>

          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["🎯", "ML-powered attrition prediction"],
              ["💸", "Automated payroll processing"],
              ["📊", "Real-time analytics dashboards"],
              ["🏖️",  "Smart leave management"],
            ].map(([emoji, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}`}</style>
      </div>

      {/* Right — login form */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 48, background: "var(--bg-primary)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
              Sign in
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Enter your credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="form-label">Password</label>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", color: "var(--text-muted)",
                    background: "none", border: "none", cursor: "pointer",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ justifyContent: "center", marginTop: 8 }}
            >
              {loading ? <><Loader size={16} className="spin" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 32, padding: 16, borderRadius: "var(--radius-md)",
            background: "var(--accent-light)", border: "1px solid rgba(20,184,166,.2)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--teal-600)", marginBottom: 8 }}>
              Demo Credentials
            </p>
            {[
              ["Admin",    "viraj.patil@paysphere.com"],
              ["Employee", "gunesh.yeole@paysphere.com"],
            ].map(([role, email]) => (
              <div key={role} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{role}:</span>
                <button
                  type="button"
                  onClick={() => setForm({ email, password: "Password@123" })}
                  style={{
                    fontSize: 12, color: "var(--teal-600)", fontWeight: 600,
                    background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)",
                  }}
                >
                  {email}
                </button>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Password: Password@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
