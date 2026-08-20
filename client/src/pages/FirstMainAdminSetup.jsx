import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import api from "../api";

export default function FirstMainAdminSetup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [appName, setAppName] = useState("Donation Tracker");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/auth/bootstrap/status"),
      api.get("/auth/config")
    ]).then(([status, config]) => {
      setAppName(config.data?.appName || "Donation Tracker");
      if (!status.data?.needsSetup) nav("/login", { replace: true });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [nav]);

  async function submit(e) {
    e.preventDefault(); setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setSaving(true);
    try {
      await api.post("/auth/bootstrap/create", { name: form.name, email: form.email, password: form.password });
      nav("/login", { replace: true, state: { message: "Your first Main Admin account was created. You can now sign in." } });
    } catch (e) { setError(e.response?.data?.error || "Could not create the first Main Admin."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-gray-500">Checking first-time setup...</div>;
  return <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/40 flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-900 px-7 py-7 text-white">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 grid place-items-center mb-4"><ShieldCheck size={24}/></div>
        <h1 className="text-2xl font-bold">Set up {appName}</h1>
        <p className="text-sm text-gray-300 mt-1">Create the first Main Admin account for this website.</p>
      </div>
      <form onSubmit={submit} className="p-7 space-y-4">
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Name</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full border rounded-xl px-4 py-3"/></label>
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Email</span><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full border rounded-xl px-4 py-3"/></label>
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Password</span><input required minLength="6" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full border rounded-xl px-4 py-3"/></label>
        <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</span><input required minLength="6" type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} className="w-full border rounded-xl px-4 py-3"/></label>
        {error && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <button disabled={saving} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold">{saving?"Creating...":"Create First Main Admin"}</button>
      </form>
    </div>
  </div>;
}
