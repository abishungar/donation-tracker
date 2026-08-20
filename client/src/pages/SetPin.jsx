import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import api from "../api";

export default function SetPin() {
  const [q] = useSearchParams();
  const nav = useNavigate();
  const token = q.get("token") || "";
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault(); setMsg("");
    if (token.length < 20) return setMsg("This PIN link is missing or invalid. Please request a new link.");
    if (!/^\d{4,8}$/.test(pin)) return setMsg("PIN must contain 4 to 8 digits.");
    if (pin !== confirm) return setMsg("PINs do not match.");
    setSaving(true);
    try { await api.post("/auth/set-pin", { token, pin }); setMsg("PIN saved successfully. You can now sign in."); setTimeout(()=>nav("/login"), 1200); }
    catch(e){ setMsg(e.response?.data?.error || "Could not set your PIN. Please request a new link."); }
    finally { setSaving(false); }
  }
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-7 space-y-5"><div className="text-center"><div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center"><KeyRound size={22}/></div><h1 className="text-2xl font-bold text-gray-900">Set up your PIN</h1><p className="text-sm text-gray-500 mt-1">Create the PIN you will use to sign in.</p></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">New PIN</label><input className="w-full border border-gray-200 rounded-xl px-4 py-3 tracking-[0.35em] text-center text-lg outline-none focus:ring-2 focus:ring-brand-200" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" maxLength="8" required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g, ""))}/></div><div><label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm PIN</label><input className="w-full border border-gray-200 rounded-xl px-4 py-3 tracking-[0.35em] text-center text-lg outline-none focus:ring-2 focus:ring-brand-200" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" maxLength="8" required value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g, ""))}/></div>{msg&&<div className={`rounded-xl px-4 py-3 text-sm ${msg.includes("successfully")?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{msg}</div>}<button disabled={saving} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold">{saving?"Saving...":"Save PIN"}</button><button type="button" onClick={()=>nav("/login")} className="w-full text-sm text-gray-500 hover:text-gray-800">Back to sign in</button></form></div>
}
