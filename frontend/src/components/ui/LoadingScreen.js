// ============================================================
// src/components/ui/LoadingScreen.js
// ============================================================
import React from "react";

export default function LoadingScreen() {
  return (
    <div style={{
      position:"fixed", inset:0,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"var(--bg-primary)", zIndex:9999,
      gap:16,
    }}>
      <div style={{
        width:48, height:48, borderRadius:14,
        background:"linear-gradient(135deg,var(--teal-500),var(--blue-500))",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 8px 24px rgba(20,184,166,.35)",
        animation:"pulse 1.5s ease-in-out infinite",
      }}>
        <span style={{color:"#fff",fontFamily:"var(--font-display)",fontWeight:800,fontSize:20}}>P</span>
      </div>
      <p style={{color:"var(--text-secondary)",fontSize:14}}>Loading PaySphereX…</p>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(.95)}}`}</style>
    </div>
  );
}
