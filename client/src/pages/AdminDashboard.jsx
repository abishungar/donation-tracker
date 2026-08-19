import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import ContactModal from "../components/ContactModal.jsx";
import GroupModal from "../components/GroupModal.jsx";
import DonationModal from "../components/DonationModal.jsx";
import UserModal from "../components/UserModal.jsx";
import ContactDetailModal from "../components/ContactDetailModal.jsx";
import BulkDonationEntry from "../components/BulkDonationEntry.jsx";
import Analytics from "../components/Analytics.jsx";
import ConfirmDelete from "../components/ConfirmDelete.jsx";
import api from "../api";
import {
  UserPlus, Users2, HeartHandshake, Pencil, Trash2, ShieldCheck, Rows3,
} from "lucide-react";

const TABS = ["Overview", "Analytics", "Contacts", "Groups", "Donations", "Users"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [error, setError] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactSort, setContactSort] = useState("first");

  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'contact'|'group'|'donation'|'user', data? }

  function loadAll() {
    api.get("/groups").then((r) => setGroups(r.data)).catch(() => {});
    api.get("/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get("/contacts").then((r) => setContacts(r.data)).catch(() => {});
    api.get("/donations").then((r) => setDonations(r.data)).catch(() => {});
  }
  useEffect(loadAll, []);

  function closeModal() {
    setModal(null);
  }
  function onSaved() {
    closeModal();
    loadAll();
  }

  async function deleteContact(id) { try { await api.delete(`/contacts/${id}`); setDeleteTarget(null); loadAll(); } catch (err) { setError(err.response?.data?.error || "Could not delete contact"); } }

  async function deleteUser(id) { try { await api.delete(`/users/${id}`); setDeleteTarget(null); loadAll(); } catch (err) { setError(err.response?.data?.error || "Could not delete user"); } }

  const contactsByGroup = useMemo(() => {
    const groupsMap = new Map();
    for (const g of groups) groupsMap.set(g.id, { group: g, contacts: [] });
    const noGroup = { group: null, contacts: [] };
    for (const c of contacts) {
      if (c.groupId && groupsMap.has(c.groupId)) groupsMap.get(c.groupId).contacts.push(c);
      else noGroup.contacts.push(c);
    }
    const arr = Array.from(groupsMap.values()).sort((a, b) => a.group.name.localeCompare(b.group.name));
    if (noGroup.contacts.length) arr.push(noGroup);
    return arr;
  }, [groups, contacts]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon={UserPlus} label="Add Contact" onClick={() => setModal({ type: "contact" })} />
          <QuickAction icon={Users2} label="Add Group" onClick={() => setModal({ type: "group" })} />
          <QuickAction icon={Rows3} label="Bulk Add Donations" onClick={() => setModal({ type: "bulkDonation" })} />
          <QuickAction icon={HeartHandshake} label="Add Donation" onClick={() => setModal({ type: "donation" })} primary />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
              tab === t ? "bg-brand-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:border-brand-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {tab === "Overview" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">{g.name}</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">
                ${g.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Manager: {g.manager?.name || g.manager?.email || "Unassigned"} · {g._count.contacts} contacts
              </p>
            </div>
          ))}
          {groups.length === 0 && <p className="text-gray-400">No groups yet — add one to get started.</p>}
        </div>
      )}

      {tab === "Analytics" && <Analytics />}

      {tab === "Contacts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <input value={contactSearch} onChange={e=>setContactSearch(e.target.value)} placeholder="Search contacts..." className="border rounded-xl px-4 py-2.5 w-full sm:max-w-md focus:ring-2 focus:ring-brand-200 outline-none" />
            <select value={contactSort} onChange={e=>setContactSort(e.target.value)} className="border rounded-xl px-3 py-2.5"><option value="first">Sort by first name</option><option value="last">Sort by last name</option><option value="money">Most money given</option></select>
          </div>
          <div className="divide-y">{[...contacts].filter(c=>`${c.firstName} ${c.lastName} ${c.email||""}`.toLowerCase().includes(contactSearch.toLowerCase())).sort((a,b)=>contactSort==="money"?(b.totalDonated||0)-(a.totalDonated||0):contactSort==="last"?`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`):`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map(c=><div key={c.id} onClick={()=>setModal({type:"contactDetail",data:c})} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-brand-50/40 cursor-pointer">
            <div><p className="font-semibold text-gray-800">{c.firstName} {c.lastName}</p><p className="text-xs text-gray-400">{c.group?.name||"No group"} · {c.email||c.phone||"No contact info"}</p></div>
            <button onClick={e=>{e.stopPropagation();setModal({type:"donation",data:c})}} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap">+ Add Donation</button>
          </div>)}</div>
        </div>
      )}

      {tab === "Groups" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(g=><button key={g.id} onClick={async()=>{try{const r=await api.get(`/groups/${g.id}`);setModal({type:"groupDetail",data:r.data})}catch{}}} className="text-left bg-white rounded-2xl border shadow-sm p-5 hover:border-brand-300 hover:shadow transition">
            <div className="flex justify-between gap-3"><div><h3 className="font-semibold text-gray-800">{g.name}</h3><p className="text-xs text-gray-400 mt-1">{g._count?.contacts||0} contacts · {g.manager?.name||g.manager?.email||"No owner assigned"}</p></div><Pencil size={16} className="text-gray-300"/></div>
            <div className="mt-5"><p className="text-xs uppercase tracking-wide text-gray-400">Total raised</p><p className="text-2xl font-bold text-brand-700">${Number(g.totalRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p><p className="text-xs text-gray-400 mt-1">${Number(g.monthRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})} this month</p></div>
            <p className="mt-4 text-sm text-brand-600 font-medium">View contacts & donations →</p>
          </button>)}
          {groups.length===0&&<p className="text-gray-400">No groups yet.</p>}
        </div>
      )}

      {tab === "Donations" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y">
          {donations.map((d) => (
            <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.contact.firstName} {d.contact.lastName}</p>
                <p className="text-xs text-gray-400">
                  {d.group.name} · {d.type} · {new Date(d.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-brand-700">${d.amount.toLocaleString()}</span>
                <button onClick={() => setModal({ type: "editDonation", data: d })} className="text-gray-400 hover:text-brand-600">
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          ))}
          {donations.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No donations yet.</p>}
        </div>
      )}

      {tab === "Users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-medium text-gray-700 text-sm">All Users</h3>
            <button
              onClick={() => setModal({ type: "user" })}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              + Add User
            </button>
          </div>
          <div className="divide-y">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{u.name || u.email}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                  {u.role === "admin" && <ShieldCheck size={12} />}
                  {u.role}
                </span>
                <button onClick={() => setModal({type:"user",data:u})} className="text-gray-400 hover:text-brand-600"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget({type:"user",id:u.id,name:u.email})} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No users yet.</p>}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === "contact" && (
        <ContactModal contact={modal.data} groups={groups} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "group" && (
        <GroupModal group={modal.data} users={users} contacts={contacts} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "donation" && (
        <DonationModal contact={modal.data && modal.data.firstName ? modal.data : undefined} contacts={modal.groupContacts || contacts} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "editDonation" && (
        <DonationModal donation={modal.data} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "user" && (
        <UserModal contacts={contacts} user={modal.data} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "contactDetail" && (
        <ContactDetailModal contactId={modal.data.id} onClose={closeModal} />
      )}
      {modal?.type === "groupDetail" && (<div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-auto"><div className="bg-white rounded-2xl max-w-4xl mx-auto my-8 shadow-xl"><div className="p-5 border-b flex justify-between"><div><h2 className="text-xl font-bold">{modal.data.name}</h2><p className="text-sm text-gray-500">Owner: {modal.data.manager?.name||modal.data.manager?.email||"Unassigned"} · Total raised: ${Number(modal.data.totalRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p></div><button onClick={closeModal}>Close</button></div><div className="p-5 grid md:grid-cols-2 gap-6"><div><div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Contacts ({modal.data.contacts.length})</h3><button onClick={()=>setModal({type:"donation",data:null,groupContacts:modal.data.contacts})} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold">+ Add Donation</button></div><div className="space-y-2 max-h-80 overflow-auto">{modal.data.contacts.map(c=><button key={c.id} onClick={()=>setModal({type:"contactDetail",data:c})} className="block w-full text-left border rounded-xl p-3 hover:bg-gray-50">{c.firstName} {c.lastName}</button>)}</div></div><div><h3 className="font-semibold mb-3">Donations</h3><div className="space-y-2 max-h-80 overflow-auto">{modal.data.donations.map(d=><div key={d.id} className="border rounded-xl p-3 flex justify-between"><span>{d.contact.firstName} {d.contact.lastName}</span><b>${Number(d.amount).toFixed(2)}</b></div>)}{modal.data.donations.length===0&&<p className="text-gray-400">No donations yet.</p>}</div></div></div></div></div>)}
      {deleteTarget && <ConfirmDelete title={`Delete ${deleteTarget.type}?`} message={`Are you sure you want to permanently delete ${deleteTarget.name}? This cannot be undone.`} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget.type==="contact" ? deleteContact(deleteTarget.id) : deleteUser(deleteTarget.id)} />}

      {modal?.type === "bulkDonation" && (
        <BulkDonationEntry contacts={contacts} onClose={closeModal} onAnySaved={loadAll} />
      )}
    </Layout>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
        primary
          ? "bg-brand-600 hover:bg-brand-700 text-white"
          : "bg-white border border-gray-200 text-gray-700 hover:border-brand-300"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
