/**
 * ============================================================
 * AIPanel.js — PaySphereX AI Intelligence Panel
 * ============================================================
 * Professional AI interface with:
 *  - Context-aware query routing (department / employee / org)
 *  - Structured AI response rendering (not raw text chat)
 *  - Risk signal visualization
 *  - Recommendation cards with priority tags
 *  - Conversation history
 *  - Loading states + error handling
 * ============================================================
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Brain, Send, X, ChevronDown, ChevronUp,
  AlertTriangle, TrendingDown, CheckCircle,
  Clock, User, Building2, Lightbulb,
  Zap, Shield, RefreshCw, Minimize2, Maximize2,
} from "lucide-react";

// ── API helper ────────────────────────────────────────────
const api = axios.create({ baseURL: "/api/v1" });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("accessToken");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Design tokens ────────────────────────────────────────
const RISK_STYLE = {
  Critical: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
  High:     { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
  Medium:   { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B" },
  Low:      { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", dot: "#22C55E" },
  Unknown:  { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", dot: "#94A3B8" },
};

const PRIORITY_STYLE = {
  Immediate:   { bg: "#FEE2E2", text: "#991B1B" },
  "Short-term":{ bg: "#FEF3C7", text: "#92400E" },
  "Long-term": { bg: "#DBEAFE", text: "#1E40AF" },
};

// ── Suggested queries ────────────────────────────────────
const SUGGESTED_QUERIES = [
  { label: "Attrition risks this month",  q: "Which employees are at highest attrition risk and why?" },
  { label: "Burnout in Engineering",       q: "Analyze burnout risk in the Engineering department" },
  { label: "Sick leave patterns",          q: "What are the sick leave patterns and what do they indicate?" },
  { label: "Workforce health summary",     q: "Give me an executive summary of overall workforce health" },
  { label: "Overtime concerns",            q: "Are there concerns about overtime hours in any department?" },
];

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const s = RISK_STYLE[level] || RISK_STYLE.Unknown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {level} Risk
    </span>
  );
}

function ObservationCard({ obs }) {
  const isAlert = obs.value !== obs.benchmark;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8,
      background: isAlert ? "#FFFBEB" : "#F0FDF4",
      border: `1px solid ${isAlert ? "#FDE68A" : "#BBF7D0"}`,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B",
            textTransform: "uppercase", letterSpacing: ".05em" }}>{obs.signal}</span>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
            <span style={{ color: isAlert ? "#D97706" : "#16A34A" }}>{obs.value}</span>
            {obs.benchmark && (
              <span style={{ color: "#94A3B8", fontSize: 11, marginLeft: 6 }}>
                (benchmark: {obs.benchmark})
              </span>
            )}
          </div>
        </div>
        {isAlert ? <AlertTriangle size={14} color="#F59E0B" /> : <CheckCircle size={14} color="#22C55E" />}
      </div>
      {obs.interpretation && (
        <p style={{ fontSize: 12, color: "#64748B", marginTop: 5, lineHeight: 1.5 }}>
          {obs.interpretation}
        </p>
      )}
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const ps = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE["Short-term"];
  return (
    <div style={{
      display: "flex", gap: 12, padding: "10px 14px",
      background: "#F8FAFC", border: "1px solid #E2E8F0",
      borderRadius: 8, marginBottom: 8,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "#E0F2FE", color: "#0369A1",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>{index + 1}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 6, lineHeight: 1.5 }}>
          {rec.action}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: ps.bg, color: ps.text,
          }}>{rec.priority}</span>
          {rec.owner && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: "#E0F2FE", color: "#0369A1",
            }}>{rec.owner}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AIResultCard({ result }) {
  const [showObs, setShowObs]   = useState(false);
  const [showContext, setShowContext] = useState(false);
  if (!result) return null;

  const rs = RISK_STYLE[result.risk_level] || RISK_STYLE.Unknown;

  return (
    <div style={{
      background: "#fff", border: `1px solid ${rs.border}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: `linear-gradient(135deg, ${rs.bg}, #fff)`,
        borderBottom: `1px solid ${rs.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Brain size={16} color="#14B8A6" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#14B8A6",
              textTransform: "uppercase", letterSpacing: ".06em" }}>AI Analysis</span>
            {result.cached && (
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99,
                background: "#E0F2FE", color: "#0369A1", fontWeight: 600 }}>Cached</span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", lineHeight: 1.6 }}>
            {result.summary}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <RiskBadge level={result.risk_level} />
          {result.risk_score !== null && result.risk_score !== undefined && (
            <div style={{ fontSize: 11, color: "#64748B" }}>
              Score: <strong style={{ color: rs.dot }}>{result.risk_score}/100</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Root Causes */}
        {result.root_causes?.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <TrendingDown size={13} color="#EF4444" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "#64748B" }}>Root Causes</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.root_causes.map((c, i) => (
                <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 4 }}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Lightbulb size={13} color="#F59E0B" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "#64748B" }}>Recommended Actions</span>
            </div>
            {result.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={typeof rec === "string" ? { action: rec, priority: "Short-term" } : rec} index={i} />
            ))}
          </div>
        )}

        {/* Observations (collapsible) */}
        {result.observations?.length > 0 && (
          <div>
            <button onClick={() => setShowObs(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, color: "#64748B",
              textTransform: "uppercase", letterSpacing: ".06em", padding: 0, marginBottom: 8,
            }}>
              <Shield size={13} color="#3B82F6" />
              Data Signals ({result.observations.length})
              {showObs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showObs && result.observations.map((obs, i) => (
              <ObservationCard key={i} obs={typeof obs === "string" ? { signal: obs, value: "", benchmark: "" } : obs} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 10, borderTop: "1px solid #F1F5F9",
        }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Confidence: <strong style={{ color: "#64748B" }}>{result.confidence || "—"}</strong>
            {result.data_coverage && ` · ${result.data_coverage}`}
          </span>
          {result.fallback && (
            <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>
              ⚠ Fallback mode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN AI PANEL
// ─────────────────────────────────────────────────────────
export default function AIPanel({ onClose, initialContext = null }) {
  const [mode,       setMode]       = useState("query"); // query | employee | department
  const [input,      setInput]      = useState(initialContext?.question || "");
  const [deptFilter, setDeptFilter] = useState(initialContext?.department || "");
  const [empInput,   setEmpInput]   = useState(initialContext?.employeeCode || "");
  const [loading,    setLoading]    = useState(false);
  const [history,    setHistory]    = useState([]);
  const [error,      setError]      = useState(null);
  const [minimized,  setMinimized]  = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Auto-fire if initial context has a question
  useEffect(() => {
    if (initialContext?.question) submitQuery(initialContext.question);
  }, []); // eslint-disable-line

  const submitQuery = useCallback(async (question = input, extra = {}) => {
    const q = (question || "").trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);
    setHistory(h => [...h, { type: "user", text: q }]);
    setInput("");

    try {
      let response;
      if (mode === "employee" && empInput.trim()) {
        const { data } = await api.post("/ai/employee-insight", {
          employee_code: empInput.trim().toUpperCase(),
          question: q,
        });
        response = data.data;
      } else if (mode === "department") {
        const params = new URLSearchParams({ department: deptFilter || "", question: q });
        const { data } = await api.get(`/ai/department-summary?${params}`);
        response = data.data;
      } else {
        const { data } = await api.post("/ai/query", {
          question: q,
          department: deptFilter || undefined,
        });
        response = data.data;
      }
      setHistory(h => [...h, { type: "ai", result: response }]);
    } catch (err) {
      const msg = err.response?.data?.error || "Request failed. Please try again.";
      if (err.response?.status === 429) {
        setError(`Rate limit reached. ${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [input, mode, empInput, deptFilter, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuery(); }
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      width: minimized ? 260 : 520,
      maxHeight: minimized ? "auto" : "85vh",
      background: "#fff",
      borderRadius: 16, border: "1px solid #E2E8F0",
      boxShadow: "0 20px 60px rgba(0,0,0,.15), 0 0 0 1px rgba(20,184,166,.1)",
      display: "flex", flexDirection: "column",
      transition: "width .25s ease, max-height .25s ease",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: "linear-gradient(135deg, #0F172A, #1E293B)",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", flexShrink: 0,
      }} onClick={() => minimized && setMinimized(false)}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(20,184,166,.2)", border: "1px solid rgba(20,184,166,.3)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Brain size={18} color="#2DD4BF" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>PaySphereX AI</div>
          {!minimized && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
              Workforce Intelligence Engine
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized(v => !v); }}
            style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 6,
              width: 26, height: 26, cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 6,
                width: 26, height: 26, cursor: "pointer", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center" }}
            ><X size={12} /></button>
          )}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Mode tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid #F1F5F9",
            background: "#F8FAFC", flexShrink: 0,
          }}>
            {[
              { id: "query",      label: "Ask AI",       icon: <Brain size={11} /> },
              { id: "employee",   label: "Employee",     icon: <User size={11} /> },
              { id: "department", label: "Department",   icon: <Building2 size={11} /> },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                flex: 1, padding: "9px 6px", border: "none", cursor: "pointer",
                background: mode === m.id ? "#fff" : "none",
                borderBottom: mode === m.id ? "2px solid #14B8A6" : "2px solid transparent",
                color: mode === m.id ? "#14B8A6" : "#64748B",
                fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "all .15s",
              }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Contextual filters */}
          {(mode === "employee" || mode === "department" || mode === "query") && (
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid #F1F5F9",
              background: "#FAFAFA", flexShrink: 0, display: "flex", gap: 8,
            }}>
              {mode === "employee" && (
                <input
                  value={empInput}
                  onChange={e => setEmpInput(e.target.value)}
                  placeholder="Employee code (e.g. EMP004)"
                  style={{
                    flex: 1, padding: "6px 10px", fontSize: 12,
                    border: "1px solid #E2E8F0", borderRadius: 7,
                    outline: "none", background: "#fff", fontFamily: "var(--font-mono)",
                  }}
                />
              )}
              {(mode === "department" || mode === "query") && (
                <input
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  placeholder="Filter by dept. (optional)"
                  style={{
                    flex: 1, padding: "6px 10px", fontSize: 12,
                    border: "1px solid #E2E8F0", borderRadius: 7,
                    outline: "none", background: "#fff",
                  }}
                />
              )}
            </div>
          )}

          {/* Conversation area */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 14px",
            display: "flex", flexDirection: "column", gap: 16,
            minHeight: 200,
          }}>

            {/* Empty state with suggestions */}
            {history.length === 0 && !loading && (
              <div>
                <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12, textAlign: "center" }}>
                  Ask anything about your workforce data
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTED_QUERIES.map((sq, i) => (
                    <button key={i} onClick={() => submitQuery(sq.q)}
                      style={{
                        padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
                        background: "#F8FAFC", cursor: "pointer", textAlign: "left",
                        fontSize: 12, color: "#374151", fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "border-color .15s, background .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#14B8A6"; e.currentTarget.style.background = "#F0FDFA"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#F8FAFC"; }}
                    >
                      <Zap size={11} color="#14B8A6" style={{ flexShrink: 0 }} />
                      {sq.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.map((item, i) => (
              <div key={i}>
                {item.type === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "80%", padding: "9px 13px", borderRadius: "12px 12px 2px 12px",
                      background: "#0F172A", color: "#fff", fontSize: 13, lineHeight: 1.55,
                    }}>
                      {item.text}
                    </div>
                  </div>
                )}
                {item.type === "ai" && <AIResultCard result={item.result} />}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{
                padding: "16px 18px", background: "#F8FAFC",
                border: "1px solid #E2E8F0", borderRadius: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RefreshCw size={14} color="#14B8A6" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "#64748B" }}>
                    Analyzing workforce data…
                  </span>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  {["Fetching context", "Building prompt", "Generating insight"].map((step, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 99,
                      background: "#E0F2FE", color: "#0369A1", fontWeight: 600,
                    }}>{step}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "#FEF2F2", border: "1px solid #FECACA",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#991B1B", lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: "12px 14px", borderTop: "1px solid #F1F5F9",
            background: "#fff", flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about attrition, burnout, leave patterns…"
                rows={2}
                style={{
                  flex: 1, padding: "9px 12px", fontSize: 13,
                  border: "1px solid #E2E8F0", borderRadius: 10,
                  outline: "none", resize: "none", lineHeight: 1.5,
                  fontFamily: "inherit", color: "#1E293B",
                  transition: "border-color .15s",
                }}
                onFocus={e => e.target.style.borderColor = "#14B8A6"}
                onBlur={e  => e.target.style.borderColor = "#E2E8F0"}
              />
              <button
                onClick={() => submitQuery()}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: loading || !input.trim() ? "#F1F5F9" : "#0F172A",
                  color: loading || !input.trim() ? "#94A3B8" : "#fff",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background .15s",
                }}
              >
                <Send size={15} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: "#CBD5E1", marginTop: 6, textAlign: "center" }}>
              ↵ Enter to send · Shift+Enter for new line · Powered by Claude AI
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
