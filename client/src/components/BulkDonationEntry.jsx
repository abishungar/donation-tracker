import React,{useMemo,useState}from "react";
import Modal from "./Modal.jsx";
import api from "../api";
import {Search, DollarSign} from "lucide-react";

export default function BulkDonationEntry({contacts,onClose,onAnySaved}){
 const [search,setSearch]=useState(""); const [group,setGroup]=useState("");
 const [type,setType]=useState(localStorage.getItem("defaultPaymentType")||"Online");
 const [amounts,setAmounts]=useState({}); const [saving,setSaving]=useState({});
 const groups=[...new Map(contacts.filter(c=>c.group).map(c=>[c.groupId,c.group.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 const rows=useMemo(()=>contacts.filter(c=>!group||String(c.groupId)===group).filter(c=>`${c.firstName} ${c.lastName} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),[contacts,search,group]);
 function moneyValue(v){ const n=Number(String(v).replace(/[^0-9.]/g,"")); return Number.isFinite(n)&&n>0?n.toFixed(2):""; }
 async function save(c){const amount=Number(amounts[c.id]);if(!amount)return;setSaving(x=>({...x,[c.id]:true}));try{await api.post("/donations",{contactId:c.id,groupId:c.groupId,amount,type});setAmounts(x=>({...x,[c.id]:""}));onAnySaved?.()}finally{setSaving(x=>({...x,[c.id]:false}))}}
 function setPayment(v){setType(v);localStorage.setItem("defaultPaymentType",v)}
 return <Modal title="Bulk Donations" onClose={onClose} wide>
  <div className="space-y-3 mb-4">
   <div className="grid sm:grid-cols-[1fr_220px] gap-3">
    <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by contact name, email, or phone..." className="w-full border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-200 rounded-xl pl-10 pr-4 py-2.5 outline-none"/></div>
    <select value={group} onChange={e=>setGroup(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 bg-white"><option value="">All groups</option>{groups.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3"><span className="text-sm text-brand-900"><b>{rows.length}</b> contacts shown · select a group to view only that group</span><div className="flex items-center gap-2"><span className="text-sm text-gray-600">Payment type</span><select value={type} onChange={e=>setPayment(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white"><option>Online</option><option>Cash</option><option>Check</option><option>In-Kind</option></select></div></div>
  </div>
  <div className="border border-gray-200 rounded-2xl overflow-auto max-h-[60vh]"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-gray-50 z-10 border-b"><tr><th className="p-3 text-left">Contact</th><th className="p-3 text-left">Group</th><th className="p-3 text-left">Donation amount</th><th className="p-3"></th></tr></thead><tbody>{rows.map(c=><tr key={c.id} className="border-t hover:bg-gray-50"><td className="p-3"><div className="font-medium text-gray-800">{c.firstName} {c.lastName}</div><div className="text-xs text-gray-400">{c.email||c.phone||"No contact info"}</div></td><td className="p-3 text-gray-500">{c.group?.name||"No group"}</td><td className="p-3"><div className="relative w-40"><DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input inputMode="decimal" value={amounts[c.id]||""} onBlur={e=>setAmounts(x=>({...x,[c.id]:moneyValue(e.target.value)}))} onChange={e=>setAmounts(x=>({...x,[c.id]:e.target.value}))} placeholder="15.00" className="w-full border rounded-xl pl-9 pr-3 py-2 font-semibold tabular-nums focus:ring-2 focus:ring-brand-200 outline-none"/></div></td><td className="p-3"><button disabled={!c.groupId||saving[c.id]||!Number(amounts[c.id])} onClick={()=>save(c)} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 font-medium">{saving[c.id]?"Saving...":"Add donation"}</button></td></tr>)}</tbody></table>{rows.length===0&&<div className="p-8 text-center text-gray-400">No contacts found.</div>}</div>
 </Modal>
}