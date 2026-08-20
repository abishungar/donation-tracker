import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, LockKeyhole, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [firstAdminMode, setFirstAdminMode] = useState(false);
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("Donation Tracker");
  const [setupRequired, setSetupRequired] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    api.get("/auth/config").then(r => {
      setAppName(r.data?.appName || "Donation Tracker");
      setSetupRequired(!!r.data?.setupRequired);
      if (r.data?.setupRequired) setFirstAdminMode(true);
    }).catch(() => {});
  }, []);

  function clearMessages(){setMessage("");setError("");}

  async function submit(e){
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      if (firstAdminMode) {
        if (credential !== confirmPassword) throw { response: { data: { error: "Passwords do not match" } } };
        const r = await api.post("/auth/bootstrap-main-admin", { name, email, password: credential });
        setMessage(r.data?.message || "First Main Admin created. You can now sign in.");
        setFirstAdminMode(false);
        setSetupRequired(false);
        setCredential("");
        setConfirmPassword("");
        return;
      }
      if(setupMode){
        const r=await api.post("/auth/request-pin-link",{email});
        setMessage(r.data.message||"If your email is registered, a PIN setup link has been sent.");
        return;
      }
      const u=await login(email,credential);
      nav(u.role==="admin"?"/admin":u.role==="manager"?"/manager":"/me");
    } catch(e){setError(e.response?.data?.error||"Login failed");}
    finally{setLoading(false);}
  }

  if (firstAdminMode) return <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/40 flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 px-7 py-7 text-white">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 grid place-items-center mb-4"><ShieldCheck size={23}/></div>
          <h1 className="text-2xl font-bold">Create First Main Admin</h1>
          <p className="text-sm text-gray-300 mt-1">This setup is available because no Main Admin exists yet.</p>
        </div>
        <div className="p-7">
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Name</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></label>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Email</span><div className="relative"><Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></div></label>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Password</span><input type="password" autoComplete="new-password" required minLength={8} value={credential} onChange={e=>setCredential(e.target.value)} placeholder="At least 8 characters" className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></label>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</span><input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></label>
            {error&&<div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}
            {message&&<div className="rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3">{message}</div>}
            <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold">{loading?"Creating...":"Create First Main Admin"}</button>
          </form>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-5">After the first Main Admin is created, this setup screen is disabled.</p>
    </div>
  </div>;

  return <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/40 flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 px-7 py-7 text-white">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 grid place-items-center mb-4"><KeyRound size={23}/></div>
          <h1 className="text-2xl font-bold">{appName}</h1>
          <p className="text-sm text-gray-300 mt-1">Sign in with your email and PIN or password</p>
        </div>
        {!setupMode ? <div className="p-7">
          <p className="text-sm text-gray-500 mb-5">The system automatically recognizes whether your account is a contact, manager, or admin.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Email</span><div className="relative"><Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></div></label>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">PIN or Password</span><div className="relative"><LockKeyhole size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="password" required value={credential} onChange={e=>setCredential(e.target.value)} placeholder="Enter your PIN or password" className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></div></label>
            {error&&<div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}
            {message&&<div className="rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3">{message}</div>}
            <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold">{loading?"Please wait...":"Sign in"}</button>
          </form>
          <button type="button" onClick={()=>{setSetupMode(true);clearMessages();setCredential("")}} className="w-full mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium">First time or forgot your PIN? Email me a PIN setup link</button>
        </div> : <div className="p-7">
          <button type="button" onClick={()=>{setSetupMode(false);clearMessages()}} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"><ArrowLeft size={16}/> Back to sign in</button>
          <h2 className="text-xl font-bold text-gray-900">Set up your PIN</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">If your active contact record has this email, we will send a secure PIN setup link.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Email</span><div className="relative"><Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></div></label>
            {error&&<div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>}
            {message&&<div className="rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3">{message}</div>}
            <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold">{loading?"Sending...":"Email me a PIN setup link"}</button>
          </form>
        </div>}
      </div>
      {setupRequired && <div className="mt-5 text-center"><button type="button" onClick={()=>{setFirstAdminMode(true);clearMessages()}} className="text-sm text-brand-600 hover:text-brand-700 font-semibold">Create First Main Admin</button></div>}
      <p className="text-center text-xs text-gray-400 mt-5">Your account type and available options are determined automatically after sign in.</p>
    </div>
  </div>;
}
