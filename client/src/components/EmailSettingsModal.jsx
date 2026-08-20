import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm] = useState({
    email_mode: "smtp", smtp_host: "smtp.gmail.com", smtp_port: "465", smtp_secure: "true", smtp_user: "", smtp_app_password: "", smtp_from: "",
    google_form_id: "", google_form_email_entry: "", google_form_name_entry: "", google_form_from_entry: "", google_form_subject_entry: "", google_form_body_entry: ""
  });
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [testing, setTesting] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  useEffect(() => { api.get("/admin/settings").then(r => setForm(f => ({ ...f, ...r.data }))).catch(e => setError(e.response?.data?.error || "Could not load email settings")).finally(() => setLoading(false)); }, []);
  const set=(key,value)=>setForm(f=>({...f,[key]:value}));
  async function save() { setError(""); setMessage(""); setSaving(true); try { await api.put("/admin/settings", form); setMessage("Email settings saved."); } catch(e) { setError(e.response?.data?.error || "Could not save email settings"); } finally { setSaving(false); } }
  async function testEmail() { setError(""); setMessage(""); setTesting(true); try { await api.put("/admin/settings", form); const r=await api.post("/admin/email/test", {to:testTo}); setMessage(`${r.data.message}${r.data.messageId ? ` Message ID: ${r.data.messageId}` : ""}`); } catch(e) { setError(e.response?.data?.error || "Email test failed"); } finally { setTesting(false); } }
  const isForm = ["google_form","google-form","form"].includes(String(form.email_mode).toLowerCase());
  return <Modal title="Email Delivery Settings" onClose={onClose}>{loading?<p className="text-sm text-gray-400">Loading settings...</p>:<>
    <Field label="How should emails be sent?"><select value={form.email_mode||"smtp"} className={inputCls} onChange={e=>set("email_mode",e.target.value)}><option value="smtp">SMTP (Gmail App Password / SMTP)</option><option value="google_form">Google Form submission</option></select></Field>
    {isForm ? <>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-4">The app will submit the email information to your Google Form. Your Google Form/Apps Script automation must be configured to actually send the email. Use the numeric entry IDs from the form fields (for example, 123456789).</div>
      <Field label="Google Form ID"><input value={form.google_form_id} className={inputCls} onChange={e=>set("google_form_id",e.target.value)} placeholder="1FAIpQL... or full Google Form URL"/></Field>
      <Field label="Recipient email entry number"><input value={form.google_form_email_entry} className={inputCls} onChange={e=>set("google_form_email_entry",e.target.value)} placeholder="123456789"/></Field>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Name to show entry number"><input value={form.google_form_name_entry} className={inputCls} onChange={e=>set("google_form_name_entry",e.target.value)} placeholder="Optional"/></Field><Field label="From address entry number"><input value={form.google_form_from_entry} className={inputCls} onChange={e=>set("google_form_from_entry",e.target.value)} placeholder="Optional"/></Field></div>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Email subject entry number"><input value={form.google_form_subject_entry} className={inputCls} onChange={e=>set("google_form_subject_entry",e.target.value)} placeholder="Optional"/></Field><Field label="Email body entry number"><input value={form.google_form_body_entry} className={inputCls} onChange={e=>set("google_form_body_entry",e.target.value)} placeholder="Optional"/></Field></div>
    </> : <>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-4">For Gmail SMTP, enable 2-Step Verification and create a Google App Password. Spaces are removed automatically. On Render Free, direct SMTP may be blocked by the hosting network.</div>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="SMTP Host"><input value={form.smtp_host} className={inputCls} onChange={e=>set("smtp_host",e.target.value)}/></Field><Field label="SMTP Port"><input type="number" value={form.smtp_port} className={inputCls} onChange={e=>set("smtp_port",e.target.value)}/></Field></div>
      <Field label="SMTP Username / Email"><input type="email" value={form.smtp_user} className={inputCls} onChange={e=>set("smtp_user",e.target.value)} placeholder="yourname@gmail.com"/></Field>
      <Field label="SMTP Password / App Password"><input type="password" value={form.smtp_app_password} className={inputCls} onChange={e=>set("smtp_app_password",e.target.value)} placeholder="Enter to change the saved password"/></Field>
      <Field label="From Address (optional)"><input type="email" value={form.smtp_from} className={inputCls} onChange={e=>set("smtp_from",e.target.value)} placeholder="Leave blank to use SMTP username"/></Field>
      <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={String(form.smtp_secure)==="true" || String(form.smtp_secure)==="1"} onChange={e=>set("smtp_secure",e.target.checked?"true":"false")}/> Use SSL/TLS (port 465)</label>
    </>}
    <div className="border-t pt-4 mt-2"><Field label="Send test email to"><input type="email" value={testTo} className={inputCls} onChange={e=>setTestTo(e.target.value)} placeholder="you@example.com"/></Field></div>
    {error&&<div className="text-sm text-red-600 mb-3 break-words bg-red-50 rounded-lg p-3">{error}</div>}{message&&<div className="text-sm text-green-700 mb-3 break-words bg-green-50 rounded-lg p-3">{message}</div>}
    <div className="flex gap-2 justify-end"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Close</button><button type="button" onClick={save} disabled={saving||testing} className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50">{saving?"Saving...":"Save Settings"}</button><PrimaryButton type="button" onClick={testEmail} disabled={saving||testing||!testTo}>{testing?"Testing...":"Save & Send Test"}</PrimaryButton></div>
  </>}</Modal>;
}
