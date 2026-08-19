import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import EmailSettingsModal from "../components/EmailSettingsModal.jsx";
import api from "../api";
import { Mail, ShieldCheck } from "lucide-react";

export default function MainAdminPage() {
  const [settings, setSettings] = useState({});
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try { const r = await api.get("/admin/settings"); setSettings(r.data); }
    catch (e) { setError(e.response?.data?.error || "Could not load Main Admin settings"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-semibold text-gray-800">Main Admin</h1><p className="text-sm text-gray-500 mt-1">System-wide administration and email configuration.</p></div>
        <ShieldCheck className="text-brand-600" size={30} />
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-gray-800">SMTP / Email</h2><p className="text-sm text-gray-500 mt-1">Configure and test the server used for password links and other emails.</p></div><Mail className="text-brand-600" size={22}/></div>
            <div className="mt-5 text-sm space-y-2"><p><span className="text-gray-400">Server:</span> {settings.smtp_host}:{settings.smtp_port}</p><p><span className="text-gray-400">Username:</span> {settings.smtp_user || "Not configured"}</p><p><span className="text-gray-400">Security:</span> {String(settings.smtp_secure) === "true" || settings.smtp_secure === "1" ? "SSL/TLS" : "STARTTLS"}</p></div>
            <button onClick={()=>setEmailOpen(true)} className="mt-5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium"><Mail size={15} className="inline mr-2"/>Open Email Settings</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6"><h2 className="font-semibold text-gray-800">Main Admin protection</h2><p className="text-sm text-gray-500 mt-1">Only users marked as Main Admin can change system-wide settings.</p><div className="mt-5 p-4 rounded-xl bg-gray-50 text-sm"><strong>Admin assignment lock:</strong> {settings.lock_main_admin === "true" ? "Enabled" : "Disabled"}</div></div>
        </div>
      )}
      {emailOpen && <EmailSettingsModal onClose={()=>{setEmailOpen(false);load();}} />}
    </Layout>
  );
}
