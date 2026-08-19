import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm] = useState({ smtp_user: "", smtp_app_password: "", smtp_from: "" });
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/settings")
      .then((r) => setForm((f) => ({ ...f, ...r.data })))
      .catch((e) => setError(e.response?.data?.error || "Could not load email settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.put("/admin/settings", form);
      setMessage("Email settings saved. Run the test below to verify Gmail.");
    } catch (e) {
      setError(e.response?.data?.error || "Could not save email settings");
    } finally {
      setSaving(false);
    }
  }

  async function testEmail() {
    setError("");
    setMessage("");
    setTesting(true);
    try {
      // Save first so the test always uses the values currently shown.
      await api.put("/admin/settings", form);
      const r = await api.post("/admin/email/test", { to: testTo });
      setMessage(r.data.message || "Test email sent.");
    } catch (e) {
      setError(e.response?.data?.error || "Email test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal title="Email / Gmail SMTP" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-gray-400">Loading settings...</p>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 mb-4">
            Use a Gmail address with a Google <strong>App Password</strong>. Do not use your normal Gmail password.
            Spaces in the App Password are removed automatically.
          </div>

          <Field label="Gmail address">
            <input type="email" value={form.smtp_user} className={inputCls}
              placeholder="yourname@gmail.com"
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} />
          </Field>

          <Field label="Google App Password">
            <input type="password" value={form.smtp_app_password} className={inputCls}
              placeholder="16-character App Password"
              onChange={(e) => setForm({ ...form, smtp_app_password: e.target.value })} />
          </Field>

          <Field label="From address (optional)">
            <input type="email" value={form.smtp_from} className={inputCls}
              placeholder="Leave blank to use the Gmail address"
              onChange={(e) => setForm({ ...form, smtp_from: e.target.value })} />
          </Field>

          <div className="border-t pt-4 mt-4">
            <Field label="Send test email to">
              <input type="email" value={testTo} className={inputCls}
                placeholder="you@example.com"
                onChange={(e) => setTestTo(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 mb-3 break-words">{error}</p>}
          {message && <p className="text-sm text-green-600 mb-3">{message}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Close
            </button>
            <button type="button" onClick={save} disabled={saving || testing}
              className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <PrimaryButton type="button" onClick={testEmail} disabled={saving || testing || !testTo}>
              {testing ? "Testing..." : "Save & Send Test"}
            </PrimaryButton>
          </div>
        </>
      )}
    </Modal>
  );
}
