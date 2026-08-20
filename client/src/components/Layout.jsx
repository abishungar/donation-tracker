import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Menu, X, LogOut, LayoutDashboard, Users2, ScrollText, HeartHandshake, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import api from "../api";

export default function Layout({ children }) {
  const { user, logout, loginNotice, clearLoginNotice } = useAuth();
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState("Donation Tracker");
  React.useEffect(() => { api.get("/auth/config").then(r => setAppName(r.data?.appName || "Donation Tracker")).catch(() => {}); }, []);
  const navigate = useNavigate();
  const location = useLocation();
  function handleLogout(){ logout(); navigate("/login"); }
  const links=[];
  if(user?.role==="admin") links.push({to:"/admin",label:"Dashboard",icon:LayoutDashboard},{to:"/admin/logs",label:"Activity Logs",icon:ScrollText},...(user?.isMainAdmin?[{to:"/admin/main-admin",label:"Main Admin",icon:ShieldCheck}]:[]));
  if(user?.role==="manager") links.push({to:"/manager",label:"My Group",icon:Users2});
  if(user?.role==="user") links.push({to:"/me",label:"My Giving",icon:HeartHandshake});
  links.push({to:"/settings",label:"Settings",icon:SettingsIcon});
  const displayName=user?.name||user?.email;
  const SidebarContent=(
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10 shrink-0"><div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center"><HeartHandshake size={18} className="text-white"/></div><span className="font-semibold text-white truncate">{appName}</span></div>
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">{links.map(l=>{const Icon=l.icon,active=location.pathname===l.to;return <Link key={l.to} to={l.to} onClick={()=>setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active?"bg-white/10 text-white":"text-gray-300 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/>{l.label}</Link>})}</nav>
      <div className="shrink-0 px-4 py-4 border-t border-white/10 bg-gray-900"><p className="text-xs text-gray-400 truncate">{displayName}</p><p className="text-[11px] text-gray-500 capitalize mb-3">{user?.role}</p><button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white w-full py-1"><LogOut size={15}/> Log out</button></div>
    </div>
  );
  return <div className="min-h-screen bg-gray-50">
    {loginNotice && <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"><div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">{loginNotice.title}</h2><p className="text-gray-600 mt-3 whitespace-pre-wrap leading-6">{loginNotice.message}</p></div><button onClick={clearLoginNotice} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><button onClick={clearLoginNotice} className="mt-6 w-full bg-brand-600 text-white rounded-xl py-3 font-semibold">Continue</button></div></div>}
    <aside className="hidden sm:flex fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 overflow-hidden">{SidebarContent}</aside>
    <div className="sm:ml-64 min-h-screen">
      <div className="sm:hidden sticky top-0 z-20 bg-gray-900 flex items-center justify-between px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center"><HeartHandshake size={15} className="text-white"/></div><span className="font-semibold text-white text-sm truncate">{appName}</span></div><button onClick={()=>setOpen(true)} className="text-white p-1"><Menu size={22}/></button></div>
      {open&&<div className="sm:hidden fixed inset-0 z-40 flex"><div className="relative flex w-72 h-full min-h-0 flex-col bg-gray-900 overflow-hidden"><div className="shrink-0 flex justify-end px-3 pt-3"><button onClick={()=>setOpen(false)} className="text-white p-1"><X size={20}/></button></div><div className="flex-1 min-h-0">{SidebarContent}</div></div><div className="flex-1 bg-black/40" onClick={()=>setOpen(false)}/></div>}
      <main className="min-w-0 px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  </div>;
}
