import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import EmailSettingsModal from "../components/EmailSettingsModal.jsx";
import ImportExportPanel from "../components/ImportExportPanel.jsx";
import api from "../api";
import { Mail, ShieldCheck, UserCog, UserCheck, UserX, Palette } from "lucide-react";

export default function MainAdminPage() {
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingUser, setSavingUser] = useState(null);

  async function load() {
    try {
      const [s, u] = await Promise.all([api.get("/admin/settings"), api.get("/users")]);
      setSettings(s.data || {});
      setUsers(u.data || []);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load Main Admin settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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

  const mode = String(settings.email_mode || "smtp").toLowerCase();
  const isGoogleForm = mode === "google_form" || mode === "form";

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Main Admin</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide administration, Main Admin users, and email delivery.</p>
        </div>
        <ShieldCheck className="text-brand-600" size={30} />
      </div>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg p-3">{error}</p>}
      {message && <p className="text-sm text-green-700 mb-4 bg-green-50 rounded-lg p-3">{message}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-5 max-w-5xl">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">Main Admin Users</h2>
                <p className="text-sm text-gray-500 mt-1">Only a current Main Admin can assign or remove Main Admin status.</p>
              </div>
              <UserCog className="text-brand-600" size={22} />
            </div>
            <div className="mt-4 divide-y border rounded-xl overflow-hidden">
              {users.map((user) => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-4 bg-white">
                  <div>
                    <p className="font-medium text-gray-800">{user.name || user.email}</p>
                    <p className="text-xs text-gray-400">{user.email} · {user.role}{user.isMainAdmin ? " · Main Admin" : ""}</p>
                  </div>
                  <button
                    onClick={() => toggleMainAdmin(user)}
                    disabled={savingUser === user.id}
                    className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${user.isMainAdmin ? "border text-red-600 hover:bg-red-50" : "bg-brand-600 text-white hover:bg-brand-700"}`}
                  >
                    {user.isMainAdmin ? <><UserX size={15} className="inline mr-1" />Remove Main Admin</> : <><UserCheck size={15} className="inline mr-1" />Set as Main Admin</>}
                  </button>
                </div>
              ))}
            </div>
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
