import React,{useMemo,useState}from "react";
import Modal from "./Modal.jsx";
import api from "../api";
import {Search, DollarSign, Users, CheckCircle2, X} from "lucide-react";

export default function BulkDonationEntry({contacts,onClose,onAnySaved}){
 const [search,setSearch]=useState(""); const [group,setGroup]=useState("");
 const [type,setType]=useState(localStorage.getItem("defaultPaymentType")||"Online");
 const [amounts,setAmounts]=useState({}); const [saving,setSaving]=useState({});
 const groups=[...new Map(contacts.filter(c=>c.group).map(c=>[c.groupId,c.group.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 const rows=useMemo(()=>contacts.filter(c=>!group||String(c.groupId)===group)
  .filter(c=>`${c.firstName} ${c.lastName} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(search.toLowerCase()))
  .sort((a,b)=>`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),[contacts,search,group]);
 const entered=Object.entries(amounts).filter(([,v])=>Number(v)>0);
 const total=entered.reduce((s,[,v])=>s+Number(v),0);
 function moneyValue(v){ const n=Number(String(v).replace(/[^0-9.]/g,"")); return Number.isFinite(n)&&n>0?n.toFixed(2):""; }
 async function save(c){const amount=Number(amounts[c.id]);if(!amount)return;setSaving(x=>({...x,[c.id]:true}));try{await api.post("/donations",{contactId:c.id,groupId:c.groupId,amount,type});setAmounts(x=>({...x,[c.id]:""}));onAnySaved?.()}finally{setSaving(x=>({...x,[c.id]:false}))}}
 async function saveAll(){for(const [id,v] of entered){const c=contacts.find(x=>String(x.id)===String(id));if(c) await save(c)}}
 function setPayment(v){setType(v);localStorage.setItem("defaultPaymentType",v)}
 return <Modal title="Bulk Donations" onClose={onClose} wide>
  <div className="space-y-4">
   <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
    <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-white text-brand-600 shadow-sm grid place-items-center"><Users size={20}/></div><div><p className="font-semibold text-gray-800">Add donations quickly</p><p className="text-sm text-gray-500">Enter an amount next to each contact you want to include.</p></div></div>
    <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-3">
     <label className="relative block"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, or phone" className="w-full border border-gray-200 bg-white rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-brand-200"/></label>
     <select value={group} onChange={e=>setGroup(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-brand-200"><option value="">All groups</option>{groups.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select>
    </div>
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <span className="text-sm text-gray-600"><b className="text-gray-900">{rows.length}</b> contacts available</span>
      <label className="flex items-center gap-2 text-sm text-gray-600">Payment type
       <select value={type} onChange={e=>setPayment(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white font-medium text-gray-700"><option>Online</option><option>Cash</option><option>Check</option><option>In-Kind</option></select>
      </label>
    </div>
   </div>

   <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
    <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_160px_130px] gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-semibold uppercase tracking-wide text-gray-500"><span>Contact</span><span>Donation amount</span><span className="text-right">Action</span></div>
    <div className="max-h-[48vh] overflow-y-auto divide-y">
    {rows.map(c=><div key={c.id} className="p-4 sm:px-5 grid sm:grid-cols-[minmax(0,1fr)_160px_130px] gap-3 sm:items-center hover:bg-gray-50 transition">
      <div className="min-w-0"><p className="font-semibold text-gray-800 truncate">{c.firstName} {c.lastName}</p><p className="text-sm text-gray-500 truncate">{c.group?.name||"No group"}{(c.email||c.phone)&&" · "}{c.email||c.phone}</p></div>
      <div className="relative"><DollarSign size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input inputMode="decimal" value={amounts[c.id]||""} onBlur={e=>setAmounts(x=>({...x,[c.id]:moneyValue(e.target.value)}))} onChange={e=>setAmounts(x=>({...x,[c.id]:e.target.value}))} placeholder="0.00" className="w-full border border-gray-200 rounded-xl bg-white pl-9 pr-3 py-3 font-semibold tabular-nums outline-none focus:ring-2 focus:ring-brand-200"/></div>
      <button disabled={!c.groupId||saving[c.id]||!Number(amounts[c.id])} onClick={()=>save(c)} className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-4 py-3 font-semibold transition">{saving[c.id]?"Saving...":"Add"}</button>
    </div>)}
    </div>
    {rows.length===0&&<div className="p-10 text-center"><Search className="mx-auto text-gray-300 mb-2"/><p className="font-medium text-gray-600">No contacts found</p><p className="text-sm text-gray-400">Try changing your search or group filter.</p></div>}
   </div>
   <div className="sticky bottom-0 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
    <div><div className="flex items-center gap-2 font-semibold text-gray-800"><CheckCircle2 size={18} className="text-brand-600"/>{entered.length} donation{entered.length!==1?"s":""} ready</div><p className="text-sm text-gray-500">${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} total</p></div>
    <div className="flex gap-2"><button onClick={()=>setAmounts({})} disabled={!entered.length} className="px-4 py-3 rounded-xl border text-gray-600 disabled:opacity-40">Clear</button><button onClick={saveAll} disabled={!entered.length} className="flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-3 rounded-xl font-semibold">Add {entered.length?`${entered.length} Donation${entered.length===1?"":"s"}`:"Donations"}</button></div>
   </div>
  </div>
 </Modal>
}