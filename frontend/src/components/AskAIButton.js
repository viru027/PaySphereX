/**
 * AskAIButton.js — Floating "Ask AI" trigger for Analytics page
 *
 * Usage in Analytics.js:
 *   import AskAIButton from "../components/AskAIButton";
 *   // Inside return JSX:
 *   <AskAIButton department={currentDept} />
 */

import React, { useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import AIPanel from "./AIPanel";

export default function AskAIButton({ department = null, employeeCode = null, defaultQuestion = null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button — placed inline in Analytics header */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            7,
          padding:        "8px 16px",
          borderRadius:   10,
          border:         "1px solid rgba(20,184,166,.3)",
          background:     "linear-gradient(135deg, #0F172A, #134E4A)",
          color:          "#2DD4BF",
          fontSize:       12,
          fontWeight:     700,
          cursor:         "pointer",
          boxShadow:      "0 2px 8px rgba(20,184,166,.2)",
          transition:     "box-shadow .2s, transform .15s",
          letterSpacing:  ".02em",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow  = "0 4px 16px rgba(20,184,166,.35)";
          e.currentTarget.style.transform  = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow  = "0 2px 8px rgba(20,184,166,.2)";
          e.currentTarget.style.transform  = "translateY(0)";
        }}
      >
        <Brain size={14} />
        Ask AI
        <span style={{
          fontSize: 9, background: "rgba(20,184,166,.25)", padding: "1px 5px",
          borderRadius: 99, fontWeight: 700, letterSpacing: ".04em",
        }}>BETA</span>
      </button>

      {/* Panel */}
      {open && (
        <AIPanel
          onClose={() => setOpen(false)}
          initialContext={{
            department:    department,
            employeeCode:  employeeCode,
            question:      defaultQuestion,
          }}
        />
      )}
    </>
  );
}
