import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm] = useState({ smtp_host: "smtp.gmail.com", smtp_port: "465", smtp_secure: "true", smtp_user: "", smtp_app_password: "", smtp_from: "" });
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [testing, setTesting] = useState(false), [diagnosing, setDiagnosing] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [diagnostic, setDiagnostic] = useState(null);

  useEffect(() => { api.get("/admin/settings").then(r => setForm(f => ({ ...f, ...r.data }))).catch(e => setError(e.response?.data?.error || "Could not load email settings")).finally(() => setLoading(false)); }, []);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function save() {
    setError(""); setMessage(""); setSaving(true);
    try { await api.put("/admin/settings", form); setMessage("SMTP settings saved."); }
    catch (e) { setError(e.response?.data?.error || "Could not save SMTP settings"); }
    finally { setSaving(false); }
  }

  async function diagnose() {
    setError(""); setMessage(""); setDiagnostic(null); setDiagnosing(true);
    try {
      await api.put("/admin/settings", form);
      const r = await api.post("/admin/email/diagnose");
      setDiagnostic(r.data.result);
      setMessage("SMTP network diagnosis completed.");
    } catch (e) {
      setError(e.response?.data?.error || "SMTP diagnosis failed");
      if (e.response?.data?.stage || e.response?.data?.code) setDiagnostic({ stage: e.response.data.stage, code: e.response.data.code });
    } finally { setDiagnosing(false); }
  }

  async function testEmail() {
    setError(""); setMessage(""); setDiagnostic(null); setTesting(true);
    try {
      await api.put("/admin/settings", form);
      const r = await api.post("/admin/email/test", { to: testTo });
      setMessage(`${r.data.message}${r.data.messageId ? ` Message ID: ${r.data.messageId}` : ""}`);
    } catch (e) {
      setError(e.response?.data?.error || "SMTP test failed");
    } finally { setTesting(false); }
  }

  const secure = String(form.smtp_secure) === "true" || String(form.smtp_secure) === "1";

  return <Modal title="SMTP / Email Settings" onClose={onClose}>
    {loading ? <p className="text-sm text-gray-400">Loading settings...</p> : <>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-4">
        Gmail: use <b>smtp.gmail.com</b>. Port <b>465 + SSL/TLS</b> or <b>587 + STARTTLS</b>. Use a Google App Password, not your normal Gmail password.
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="SMTP Host"><input value={form.smtp_host} className={inputCls} onChange={e=>set("smtp_host",e.target.value)}/></Field>
        <Field label="SMTP Port"><input type="number" value={form.smtp_port} className={inputCls} onChange={e=>set("smtp_port",e.target.value)}/></Field>
      </div>
      <Field label="SMTP Username / Email"><input type="email" value={form.smtp_user} className={inputCls} onChange={e=>set("smtp_user",e.target.value)} placeholder="yourname@gmail.com"/></Field>
      <Field label="SMTP Password / App Password"><input type="password" value={form.smtp_app_password} className={inputCls} onChange={e=>set("smtp_app_password",e.target.value)} placeholder="Enter to change the saved password"/></Field>
      <Field label="From Address (optional)"><input type="email" value={form.smtp_from} className={inputCls} onChange={e=>set("smtp_from",e.target.value)} placeholder="Leave blank to use SMTP username"/></Field>
      <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={secure} onChange={e=>set("smtp_secure",e.target.checked?"true":"false")}/> Use SSL/TLS (465). Uncheck for STARTTLS (587).</label>

      <div className="border-t pt-4 mt-2">
        <Field label="Send test email to"><input type="email" value={testTo} className={inputCls} onChange={e=>setTestTo(e.target.value)} placeholder="you@example.com"/></Field>
      </div>

      {error && <div className="text-sm text-red-700 mb-3 break-words bg-red-50 rounded-lg p-3"><b>{error}</b></div>}
      {message && <div className="text-sm text-green-700 mb-3 break-words bg-green-50 rounded-lg p-3">{message}</div>}

      {diagnostic && <div className="text-xs bg-gray-50 border rounded-xl p-3 mb-4 space-y-1">
        <div><b>DNS:</b> {Array.isArray(diagnostic.dns) ? diagnostic.dns.join(", ") : (diagnostic.dns || "failed")}</div>
        <div><b>TCP:</b> {diagnostic.tcp || "failed"}</div>
        <div><b>TLS:</b> {diagnostic.tls || "not reached"}</div>
        {diagnostic.alternate && <div className="pt-2"><b>Gmail port 587:</b> {diagnostic.alternate.error || "reachable"}</div>}
        {diagnostic.stage && <div><b>Failed stage:</b> {diagnostic.stage}</div>}
        {diagnostic.code && <div><b>Code:</b> {diagnostic.code}</div>}
      </div>}

      <div className="flex gap-2 justify-end flex-wrap">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Close</button>
        <button type="button" onClick={save} disabled={saving||testing||diagnosing} className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50">{saving?"Saving...":"Save Settings"}</button>
        <button type="button" onClick={diagnose} disabled={saving||testing||diagnosing} className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50">{diagnosing?"Diagnosing...":"Diagnose SMTP"}</button>
        <PrimaryButton type="button" onClick={testEmail} disabled={saving||testing||diagnosing||!testTo}>{testing?"Testing SMTP...":"Save & Send Test"}</PrimaryButton>
      </div>
    </>}
  </Modal>;
}
