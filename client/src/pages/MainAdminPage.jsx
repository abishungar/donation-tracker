import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import EmailSettingsModal from "../components/EmailSettingsModal.jsx";
import ImportExportPanel from "../components/ImportExportPanel.jsx";
import api from "../api";
import { Mail, ShieldCheck, UserCog, UserCheck, UserX, Palette, Bell, Settings2, ChevronDown, ChevronUp } from "lucide-react";

export default function MainAdminPage() {
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingUser, setSavingUser] = useState(null);
  const [version, setVersion] = useState("");
  const [showMainAdmins, setShowMainAdmins] = useState(false);
  const [notice, setNotice] = useState({enabled:false,audience:"all",title:"",message:""});

  async function load() {
    try {
      const [s, u] = await Promise.all([api.get("/admin/settings"), api.get("/users")]);
      setSettings(s.data || {});
      setVersion(s.data?.website_version || s.data?.app_version || "");
      setUsers(u.data || []);
      setNotice({enabled:String(s.data?.login_notice_enabled)==="true",audience:s.data?.login_notice_audience||"all",title:s.data?.login_notice_title||"",message:s.data?.login_notice_message||""});
    } catch (e) {
      setError(e.response?.data?.error || "Could not load Main Admin settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function sendCredentialReset(user) {
    setError(""); setMessage(""); setSavingUser(user.id);
    try { const r=await api.post(`/admin/users/${user.id}/reset-password`); setMessage(r.data?.message || `Setup link sent to ${user.email}.`); }
    catch(e){ setError(e.response?.data?.error || "Could not send credential setup link"); }
    finally { setSavingUser(null); }
  }

  async function toggleMainAdmin(user) {
    setError("");
    setMessage("");
    setSavingUser(user.id);
    try {
      await api.put(`/users/${user.id}`, { isMainAdmin: !user.isMainAdmin });
      setMessage(`${user.name || user.email} is ${!user.isMainAdmin ? "now" : "no longer"} a Main Admin.`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Could not change Main Admin status");
    } finally {
      setSavingUser(null);
    }
  }

  async function sendInvite(user) {
    setError(""); setMessage(""); setSavingUser(user.id);
    try { const r = await api.post(`/admin/users/${user.id}/invite`); setMessage(r.data?.message || `Password setup link sent to ${user.email}.`); }
    catch (e) { setError(e.response?.data?.error || "Could not send invite email"); }
    finally { setSavingUser(null); }
  }

  const mode = String(settings.email_mode || "smtp").toLowerCase();
  const isGoogleForm = mode === "google_form" || mode === "form";

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Main Admin</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide administration, Main Admin users, and email delivery.</p>
        </div>
        <div className="text-right"><ShieldCheck className="text-brand-600 ml-auto" size={30} />{(settings.website_version || settings.app_version) && <p className="text-xs text-gray-400 mt-1">v{settings.website_version || settings.app_version}</p>}</div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg p-3">{error}</p>}
      {message && <p className="text-sm text-green-700 mb-4 bg-green-50 rounded-lg p-3">{message}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-5 max-w-5xl">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <button onClick={()=>setShowMainAdmins(v=>!v)} className="w-full flex items-center justify-between text-left">
              <div><h2 className="font-semibold text-gray-800">Set Main Admins</h2><p className="text-sm text-gray-500 mt-1">Click to open the user list and choose who has Main Admin access.</p></div>
              {showMainAdmins?<ChevronUp size={20}/>:<ChevronDown size={20}/>}
            </button>
            {showMainAdmins && <div className="mt-4 divide-y border rounded-xl overflow-hidden">
              {users.map((user) => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-4 bg-white">
                  <div><p className="font-medium text-gray-800">{user.name || user.email}</p><p className="text-xs text-gray-400">{user.email} · {user.role}{user.isMainAdmin ? " · Main Admin" : ""}</p></div>
                  <div className="flex items-center gap-2"><button onClick={() => sendCredentialReset(user)} className="px-3 py-2 rounded-lg text-sm border text-gray-700 hover:bg-gray-50">Send setup link</button><button onClick={() => toggleMainAdmin(user)} disabled={savingUser === user.id} className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${user.isMainAdmin ? "border text-red-600 hover:bg-red-50" : "bg-brand-600 text-white hover:bg-brand-700"}`}>{user.isMainAdmin ? <><UserX size={15} className="inline mr-1"/>Remove Main Admin</> : <><UserCheck size={15} className="inline mr-1"/>Set as Main Admin</>}</button></div>
                </div>
              ))}
            </div>}
          </div>

          <ImportExportPanel />

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-semibold text-gray-800">Website Branding</h2><p className="text-sm text-gray-500 mt-1">Set the name shown on the login page, header/sidebar, and outgoing emails.</p></div>
              <Palette className="text-brand-600" size={22} />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input id="app-brand-name" defaultValue={settings.app_name || settings.email_system_name || "Donation Tracker"} className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-200" placeholder="Your system name" />
              <button onClick={async()=>{const value=document.getElementById("app-brand-name")?.value?.trim(); if(!value)return; try{await api.put("/admin/settings",{app_name:value,email_system_name:value}); setSettings(s=>({...s,app_name:value,email_system_name:value})); setMessage("Branding updated. Refresh the page to see it everywhere.");}catch(e){setError(e.response?.data?.error||"Could not save branding");}}} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-medium">Save Branding</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2"><Settings2 className="text-brand-600" size={22}/><h2 className="font-semibold text-gray-800">Website Version</h2></div>
              <p className="text-sm text-gray-500 mt-1">Version shown at the top of the Main Admin page.</p>
              <div className="mt-4 flex gap-2"><input value={version} onChange={e=>setVersion(e.target.value)} placeholder="2.4.1" className="flex-1 border rounded-xl px-4 py-3"/><button onClick={async()=>{try{await api.put("/admin/settings",{website_version:version.trim()});setSettings(x=>({...x,website_version:version.trim()}));setMessage("Website version saved.");}catch(e){setError(e.response?.data?.error||"Could not save version");}}} className="bg-brand-600 text-white px-4 rounded-xl">Save</button></div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2"><Bell className="text-brand-600" size={22}/><h2 className="font-semibold text-gray-800">Admin / Manager Login Notice</h2></div>
              <p className="text-sm text-gray-500 mt-1">Show a popup when selected staff members log in.</p>
              <div className="mt-4 space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notice.enabled} onChange={e=>setNotice(n=>({...n,enabled:e.target.checked}))}/> Enable notice</label><select value={notice.audience} onChange={e=>setNotice(n=>({...n,audience:e.target.value}))} className="w-full border rounded-xl px-3 py-2"><option value="all">All Admins & Managers</option><option value="admin">Admins only</option><option value="manager">Managers only</option></select><input value={notice.title} onChange={e=>setNotice(n=>({...n,title:e.target.value}))} placeholder="Notice title" className="w-full border rounded-xl px-3 py-2"/><textarea value={notice.message} onChange={e=>setNotice(n=>({...n,message:e.target.value}))} placeholder="Notice message" rows={3} className="w-full border rounded-xl px-3 py-2"/><button onClick={async()=>{try{await api.put("/admin/settings",{login_notice_enabled:String(notice.enabled),login_notice_audience:notice.audience,login_notice_title:notice.title,login_notice_message:notice.message});setMessage("Login notice saved.");}catch(e){setError(e.response?.data?.error||"Could not save login notice");}}} className="bg-brand-600 text-white px-4 py-2 rounded-xl">Save Notice</button></div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">Email Delivery</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Current method: <strong>{isGoogleForm ? "Google Form" : "SMTP"}</strong>.
                </p>
              </div>
              <Mail className="text-brand-600" size={22} />
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-gray-400">Method:</span> {isGoogleForm ? "Google Form submission" : "SMTP"}</p>
              {isGoogleForm ? (
                <p><span className="text-gray-400">Form:</span> {settings.google_form_id || "Not configured"}</p>
              ) : (
                <>
                  <p><span className="text-gray-400">Server:</span> {settings.smtp_host || "smtp.gmail.com"}:{settings.smtp_port || "465"}</p>
                  <p><span className="text-gray-400">Username:</span> {settings.smtp_user || "Not configured"}</p>
                  <p><span className="text-gray-400">From:</span> {settings.smtp_from || settings.smtp_user || "Not configured"}</p>
                </>
              )}
            </div>
            <button onClick={() => setEmailOpen(true)} className="mt-5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium">
              <Mail size={15} className="inline mr-2" />Configure Email Delivery
            </button>
          </div>
        </div>
      )}

      {emailOpen && <EmailSettingsModal onClose={() => { setEmailOpen(false); load(); }} />}
    </Layout>
  );
}
