// ============================================================
// src/pages/Profile.js
// ============================================================
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI, payrollAPI, leaveAPI } from "../services/api";
import toast from "react-hot-toast";
import { User, Mail, Phone, Building, Calendar, Shield } from "lucide-react";

export default function Profile() {
  const { user, setUser }           = useAuth();
  const [profile, setProfile]       = useState(null);
  const [balances, setBalances]     = useState([]);
  const [recentPayslips, setPayslips]= useState([]);
  const [pwForm, setPwForm]         = useState({ currentPassword:"",newPassword:"",confirm:"" });
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    Promise.all([
      authAPI.me(),
      leaveAPI.getBalance(),
      payrollAPI.getPayslips({ limit:3 }),
    ]).then(([me, lb, ps]) => {
      setProfile(me.data.data);
      setBalances(lb.data.data);
      setPayslips(ps.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword:pwForm.currentPassword, newPassword:pwForm.newPassword });
      toast.success("Password changed successfully");
      setPwForm({ currentPassword:"",newPassword:"",confirm:"" });
    } catch {} finally { setSaving(false); }
  };

  if (loading || !profile) return <div className="skeleton" style={{ height:500,borderRadius:"var(--radius-lg)" }} />;

  const infoRows = [
    { icon:User,     label:"Full Name",    val:`${profile.first_name} ${profile.last_name}` },
    { icon:Mail,     label:"Email",        val:profile.email },
    { icon:Phone,    label:"Phone",        val:profile.phone || "—" },
    { icon:Building, label:"Department",   val:profile.department },
    { icon:Shield,   label:"Role",         val:profile.role },
    { icon:Calendar, label:"Joined",       val:new Date(profile.date_joined).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24,maxWidth:900 }}>
      <h1 className="page-title">My Profile</h1>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        {/* Profile info */}
        <div className="card">
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:24,paddingBottom:24,borderBottom:"1px solid var(--border)" }}>
            <div className="avatar avatar-xl">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div style={{ textAlign:"center" }}>
              <h2 style={{ fontFamily:"var(--font-display)",fontSize:20,fontWeight:800 }}>
                {profile.first_name} {profile.last_name}
              </h2>
              <p style={{ color:"var(--text-secondary)",fontSize:14 }}>{profile.job_title}</p>
              <span className="badge badge-info" style={{ marginTop:6,textTransform:"capitalize" }}>{profile.role}</span>
            </div>
          </div>

          {infoRows.map(({ icon:Icon, label, val }) => (
            <div key={label} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)" }}>
              <div style={{ width:32,height:32,borderRadius:8,background:"var(--accent-light)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Icon size={14} color="var(--teal-600)" />
              </div>
              <div>
                <div style={{ fontSize:11,color:"var(--text-muted)",fontWeight:500 }}>{label}</div>
                <div style={{ fontSize:13,fontWeight:500,color:"var(--text-primary)" }}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          {/* Leave balances */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom:16 }}>Leave Balance</h3>
            {balances.filter(b=>b.annual_quota>0).map(b=>(
              <div key={b.leave_type_id} style={{ marginBottom:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:500,color:"var(--text-primary)" }}>{b.leave_type_name}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:"var(--text-primary)" }}>{b.balance} days</span>
                </div>
                <div style={{ height:6,borderRadius:99,background:"var(--slate-200)" }}>
                  <div style={{
                    height:"100%",borderRadius:99,
                    width:`${Math.min(100,(b.used/b.allotted)*100)}%`,
                    background:b.color_code||"var(--accent)",
                  }} />
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
                  <span style={{ fontSize:10,color:"var(--text-muted)" }}>{b.used} used</span>
                  <span style={{ fontSize:10,color:"var(--text-muted)" }}>{b.allotted} total</span>
                </div>
              </div>
            ))}
          </div>

          {/* Change password */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom:16 }}>Change Password</h3>
            <form onSubmit={handleChangePw} style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {[
                { name:"currentPassword", label:"Current Password" },
                { name:"newPassword",     label:"New Password" },
                { name:"confirm",         label:"Confirm New Password" },
              ].map(({ name, label }) => (
                <div key={name} className="form-group">
                  <label className="form-label">{label}</label>
                  <input type="password" className="form-input"
                    value={pwForm[name]} required minLength={8}
                    onChange={e => setPwForm({...pwForm, [name]:e.target.value})}
                  />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Changing…" : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
