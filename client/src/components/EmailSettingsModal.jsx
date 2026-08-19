import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm] = useState({ smtp_host: "smtp.gmail.com", smtp_port: "465", smtp_secure: "true", smtp_user: "", smtp_app_password: "", smtp_from: "" });
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { api.get("/admin/settings").then(r => setForm(f => ({ ...f, ...r.data }))).catch(e => setError(e.response?.data?.error || "Could not load email settings")).finally(() => setLoading(false)); }, []);
  async function save() { setError(""); setMessage(""); setSaving(true); try { await api.put("/admin/settings", form); setMessage("SMTP settings saved."); } catch(e) { setError(e.response?.data?.error || "Could not save SMTP settings"); } finally { setSaving(false); } }
  async function testEmail() { setError(""); setMessage(""); setTesting(true); try { await api.put("/admin/settings", form); const r=await api.post("/admin/email/test", {to:testTo}); setMessage(`${r.data.message}${r.data.messageId ? ` Message ID: ${r.data.messageId}` : ""}`); } catch(e) { setError(e.response?.data?.error || "SMTP test failed"); } finally { setTesting(false); } }
  const set=(key,value)=>setForm(f=>({...f,[key]:value}));
  return <Modal title="SMTP / Email Settings" onClose={onClose}>{loading?<p className="text-sm text-gray-400">Loading settings...</p>:<>
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-4">For Gmail, enable 2-Step Verification and create a Google App Password. Enter the 16-character App Password; spaces are removed automatically.</div>
    <div className="grid sm:grid-cols-2 gap-3"><Field label="SMTP Host"><input value={form.smtp_host} className={inputCls} onChange={e=>set("smtp_host",e.target.value)}/></Field><Field label="SMTP Port"><input type="number" value={form.smtp_port} className={inputCls} onChange={e=>set("smtp_port",e.target.value)}/></Field></div>
    <Field label="SMTP Username / Email"><input type="email" value={form.smtp_user} className={inputCls} onChange={e=>set("smtp_user",e.target.value)} placeholder="yourname@gmail.com"/></Field>
    <Field label="SMTP Password / App Password"><input type="password" value={form.smtp_app_password} className={inputCls} onChange={e=>set("smtp_app_password",e.target.value)} placeholder="Enter to change the saved password"/></Field>
    <Field label="From Address (optional)"><input type="email" value={form.smtp_from} className={inputCls} onChange={e=>set("smtp_from",e.target.value)} placeholder="Leave blank to use SMTP username"/></Field>
    <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={String(form.smtp_secure)==="true" || String(form.smtp_secure)==="1"} onChange={e=>set("smtp_secure",e.target.checked?"true":"false")}/> Use SSL/TLS (port 465)</label>
    <div className="border-t pt-4 mt-2"><Field label="Send test email to"><input type="email" value={testTo} className={inputCls} onChange={e=>setTestTo(e.target.value)} placeholder="you@example.com"/></Field></div>
    {error&&<div className="text-sm text-red-600 mb-3 break-words bg-red-50 rounded-lg p-3">{error}</div>}{message&&<div className="text-sm text-green-700 mb-3 break-words bg-green-50 rounded-lg p-3">{message}</div>}
    <div className="flex gap-2 justify-end"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Close</button><button type="button" onClick={save} disabled={saving||testing} className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50">{saving?"Saving...":"Save Settings"}</button><PrimaryButton type="button" onClick={testEmail} disabled={saving||testing||!testTo}>{testing?"Testing SMTP...":"Save & Send Test"}</PrimaryButton></div>
  </>}</Modal>;
}
