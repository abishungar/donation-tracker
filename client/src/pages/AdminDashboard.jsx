import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import ContactModal from "../components/ContactModal.jsx";
import GroupModal from "../components/GroupModal.jsx";
import DonationModal from "../components/DonationModal.jsx";
import UserModal from "../components/UserModal.jsx";
import ContactDetailModal from "../components/ContactDetailModal.jsx";
import BulkDonationEntry from "../components/BulkDonationEntry.jsx";
import Analytics from "../components/Analytics.jsx";
import CampaignModal from "../components/CampaignModal.jsx";
import DonationCalendar from "../components/DonationCalendar.jsx";
import ConfirmDelete from "../components/ConfirmDelete.jsx";
import PdfReportButton from "../components/PdfReportButton.jsx";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import {
  UserPlus, Users2, HeartHandshake, Pencil, Trash2, ShieldCheck, Rows3,
} from "lucide-react";

const TABS = ["Overview", "Analytics", "Calendar", "Contacts", "Groups", "Campaigns", "Donations", "Users"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
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
    api.get("/campaigns").then((r) => setCampaigns(r.data)).catch(() => {});
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

  async function deleteGroup(id) { try { await api.delete(`/groups/${id}`); setDeleteTarget(null); loadAll(); } catch (err) { setError(err.response?.data?.error || "Could not delete group"); } }

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
                Manager: {g.manager?.name || g.manager?.email || "Unassigned"} · {g.activeCount ?? g._count.contacts} contacts
              </p>
            </div>
          ))}
          {groups.length === 0 && <p className="text-gray-400">No groups yet — add one to get started.</p>}
        </div>
      )}

      {tab === "Analytics" && <Analytics />}

      {tab === "Calendar" && <DonationCalendar donations={donations} />}

      {tab === "Contacts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1 flex gap-2 items-center">
              <input value={contactSearch} onChange={e=>setContactSearch(e.target.value)} placeholder="Search by name, email, or phone..." className="border border-gray-200 bg-gray-50 hover:bg-white rounded-xl px-4 py-3 w-full sm:max-w-md focus:ring-2 focus:ring-brand-200 outline-none" />
              <PdfReportButton url="/reports/contacts/pdf" label="All Donations PDF" allowPeriod />
            </div>
            <select value={contactSort} onChange={e=>setContactSort(e.target.value)} className="border border-gray-200 bg-gray-50 hover:bg-white rounded-xl px-4 py-2.5 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-brand-200"><option value="first">First name</option><option value="last">Last name</option><option value="group">Group</option><option value="money">Most money given</option></select>
          </div>
          <div className="divide-y">{[...contacts].filter(c=>c.active!==false).filter(c=>`${c.firstName} ${c.lastName} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(contactSearch.toLowerCase())).sort((a,b)=>contactSort==="money"?(b.totalDonated||0)-(a.totalDonated||0):contactSort==="group"?`${a.group?.name||"~~~~"} ${a.lastName||""} ${a.firstName||""}`.localeCompare(`${b.group?.name||"~~~~"} ${b.lastName||""} ${b.firstName||""}`):contactSort==="last"?`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`):`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map(c=><div key={c.id} onClick={()=>setModal({type:"contactDetail",data:c})} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-brand-50/60 cursor-pointer transition">
            <div className="min-w-0"><p className="font-semibold text-gray-800">{c.firstName} {c.lastName}</p><p className="text-xs text-gray-400 truncate">{c.group?.name||"No group"} · {c.email||c.phone||"No contact info"}</p></div>
            <div className="flex items-center gap-2 shrink-0">
              <button title="Edit contact" onClick={e=>{e.stopPropagation();setModal({type:"contact",data:c})}} className="p-2 text-gray-400 hover:text-brand-600"><Pencil size={16}/></button>
              <button title="Deactivate contact" onClick={e=>{e.stopPropagation();setDeleteTarget({type:"contact",id:c.id,name:`${c.firstName} ${c.lastName}`})}} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
              <button onClick={e=>{e.stopPropagation();setModal({type:"donation",data:c})}} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-semibold whitespace-nowrap">+ Add Donation</button>
            </div>
          </div>)}</div>
        </div>
      )}

      {tab === "Groups" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(g=><div key={g.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition overflow-hidden">
            <button onClick={async()=>{try{const r=await api.get(`/groups/${g.id}`);setModal({type:"groupDetail",data:r.data})}catch(err){setError(err.response?.data?.error||"Could not load group")}}} className="w-full text-left p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 grid place-items-center"><Users2 size={18}/></span><div><h3 className="font-bold text-gray-800 truncate">{g.name}</h3><p className="text-xs text-gray-400 mt-0.5">Manager: {g.manager?.name||g.manager?.email||"Unassigned"}</p></div></div></div><span className="text-brand-600 text-sm font-semibold">Open →</span></div>
              <div className="grid grid-cols-2 gap-3 mt-6"><div className="rounded-2xl bg-gray-50 p-3"><p className="text-[11px] uppercase tracking-wide text-gray-400">Members</p><p className="text-xl font-bold text-gray-800 mt-1">{g.activeCount ?? g._count?.contacts ?? 0}</p></div><div className="rounded-2xl bg-brand-50 p-3"><p className="text-[11px] uppercase tracking-wide text-brand-600">Raised</p><p className="text-xl font-bold text-brand-700 mt-1">${Number(g.totalRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p></div></div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400"><span>${Number(g.monthRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})} this month</span><span>Click anywhere to view options, members & donations</span></div>
            </button>
            <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-end gap-4"><button type="button" onClick={()=>setModal({type:"group",data:g})} className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"><Pencil size={14}/> Edit Group</button>{user?.isMainAdmin&&<button type="button" onClick={()=>setDeleteTarget({type:"group",id:g.id,name:g.name})} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium"><Trash2 size={14}/> Delete Group</button>}</div>
          </div>)}
          {groups.length===0&&<p className="text-gray-400">No groups yet.</p>}
        </div>
      )}

      {tab === "Campaigns" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
            <div><h3 className="font-semibold text-gray-800">Campaigns</h3><p className="text-xs text-gray-400 mt-1">Create campaigns and choose them when recording donations.</p></div>
            <button onClick={() => setModal({type:"campaign"})} className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">+ Add Campaign</button>
          </div>
          <div className="divide-y">
            {campaigns.map(c => <button key={c.id} onClick={async()=>{try{const r=await api.get(`/campaigns/${c.id}`);setModal({type:"campaignDetail",data:r.data})}catch(err){setError(err.response?.data?.error||"Could not load campaign")}}} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-brand-50/50 transition"><div><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-400 mt-1">{c.description || "No description"} · {c._count?.donations || 0} donations</p></div><div className="flex items-center gap-3"><span className={`text-xs rounded-full px-2 py-1 ${c.active?"bg-green-50 text-green-700":"bg-gray-100 text-gray-500"}`}>{c.active?"Active":"Inactive"}</span><span className="text-xs text-brand-600 font-semibold">View donations →</span><span role="button" tabIndex={0} onClick={e=>{e.stopPropagation();setModal({type:"campaign",data:c})}} className="text-gray-400 hover:text-brand-600"><Pencil size={15}/></span></div></button>)}
            {!campaigns.length && <p className="px-5 py-6 text-sm text-gray-400">No campaigns yet.</p>}
          </div>
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
                <span className="text-sm font-semibold text-brand-700">${Number(d.amount || 0).toLocaleString()}</span>
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
        <DonationModal contact={modal.data && modal.data.firstName ? modal.data : undefined} contacts={modal.groupContacts || contacts} campaigns={campaigns} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "editDonation" && (
        <DonationModal donation={modal.data} campaigns={campaigns} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "campaign" && (
        <CampaignModal campaign={modal.data} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "campaignDetail" && <CampaignDetailModal campaign={modal.data} onClose={closeModal} onEdit={()=>setModal({type:"campaign",data:modal.data})} />}
      {modal?.type === "user" && (
        <UserModal contacts={contacts} groups={groups} user={modal.data} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "contactDetail" && (
        <ContactDetailModal contactId={modal.data.id} onClose={closeModal} />
      )}
      {modal?.type === "groupDetail" && (
        <GroupDetailModal
          group={modal.data}
          onClose={closeModal}
          onAddDonation={(contact) => setModal({ type: "donation", data: contact, groupContacts: modal.data.contacts })}
          onContact={(contact) => setModal({ type: "contactDetail", data: contact })}
        />
      )}
      {deleteTarget && <ConfirmDelete title={deleteTarget.type === "contact" ? "Deactivate contact?" : `Delete ${deleteTarget.type}?`} message={deleteTarget.type === "contact" ? `${deleteTarget.name} will be hidden from active contacts and group member lists. Existing donations will remain and continue to show this name.` : `Are you sure you want to permanently delete ${deleteTarget.name}? This cannot be undone.`} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget.type==="contact" ? deleteContact(deleteTarget.id) : deleteTarget.type==="group" ? deleteGroup(deleteTarget.id) : deleteUser(deleteTarget.id)} />}

      {modal?.type === "bulkDonation" && (
        <BulkDonationEntry contacts={contacts} campaigns={campaigns} onClose={closeModal} onAnySaved={loadAll} />
      )}
    </Layout>
  );
}

function CampaignDetailModal({campaign,onClose,onEdit}){
  const donations=campaign?.donations||[];
  return <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-auto"><div className="bg-white rounded-2xl max-w-5xl mx-auto my-8 shadow-xl overflow-hidden"><div className="p-5 border-b flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-800">{campaign.name}</h2><p className="text-sm text-gray-500 mt-1">{campaign.description||"No description"}</p></div><div className="flex gap-2"><button onClick={onEdit} className="px-3 py-1.5 text-sm text-brand-600">Edit</button><button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500">Close</button></div></div><div className="p-5"><div className="grid sm:grid-cols-3 gap-3 mb-5"><div className="rounded-xl bg-brand-50 p-4"><p className="text-xs text-gray-500">Total Raised</p><p className="text-2xl font-bold text-brand-700 mt-1">${Number(campaign.totalRaised||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Donations</p><p className="text-2xl font-bold text-gray-800 mt-1">{donations.length}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Status</p><p className="text-lg font-semibold mt-1">{campaign.active?"Active":"Inactive"}</p></div></div><div className="border rounded-xl overflow-hidden"><div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm">All Campaign Donations</div><div className="divide-y">{donations.map(d=><div key={d.id} className="px-4 py-3 flex items-center justify-between gap-4"><div><p className="font-medium text-gray-800">{d.contact?.firstName} {d.contact?.lastName}</p><p className="text-xs text-gray-400">{d.group?.name||"No group"} · {new Date(d.date).toLocaleDateString()} · {d.type}</p></div><b className="text-brand-700">${Number(d.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</b></div>)}{!donations.length&&<p className="p-5 text-sm text-gray-400">No donations for this campaign yet.</p>}</div></div></div></div></div>;
}

function GroupDetailModal({ group, onClose, onAddDonation, onContact }) {
  const [view, setView] = useState("summary");

  const donations = group?.donations || [];
  const contacts = group?.contacts || [];
  const total = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const months = useMemo(() => {
    const map = new Map();
    for (const d of donations) {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, { key, label: dt.toLocaleString(undefined, { month: "long", year: "numeric" }), total: 0, count: 0 });
      }
      const row = map.get(key);
      row.total += Number(d.amount || 0);
      row.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [donations]);

  const [selectedMonth, setSelectedMonth] = useState(null);
  const monthDonations = selectedMonth
    ? donations.filter((d) => {
        const dt = new Date(d.date);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}` === selectedMonth;
      })
    : donations;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-2xl max-w-5xl mx-auto my-8 shadow-xl overflow-hidden">
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{group.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manager: {group.manager?.name || group.manager?.email || "Unassigned"}
            </p>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800">Close</button>
        </div>

        <div className="p-5">
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <button
              onClick={() => { setView("summary"); setSelectedMonth(null); }}
              className={`text-left rounded-xl border p-4 ${view === "summary" && !selectedMonth ? "border-brand-400 bg-brand-50" : "hover:border-brand-300"}`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Raised So Far</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-1">{donations.length} donations</p>
            </button>

            <button
              onClick={() => { setView("months"); setSelectedMonth(null); }}
              className={`text-left rounded-xl border p-4 ${view === "months" ? "border-brand-400 bg-brand-50" : "hover:border-brand-300"}`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">By Month</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{months.length} month{months.length === 1 ? "" : "s"}</p>
              <p className="text-xs text-brand-600 mt-1">Click to view monthly totals →</p>
            </button>

            <button
              onClick={() => { setView("users"); setSelectedMonth(null); }}
              className={`text-left rounded-xl border p-4 ${view === "users" ? "border-brand-400 bg-brand-50" : "hover:border-brand-300"}`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Users / Contacts</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{contacts.length}</p>
              <p className="text-xs text-brand-600 mt-1">Click to see everyone →</p>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <PdfReportButton url={`/reports/groups/${group.id}/pdf`} label="Group PDF" allowPeriod />
            <button
              onClick={() => onAddDonation(null)}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
            >
              + Add Donation
            </button>
            {selectedMonth && (
              <button onClick={() => setSelectedMonth(null)} className="px-4 py-2 rounded-lg border text-sm">
                Show All Months
              </button>
            )}
          </div>

          {view === "summary" && !selectedMonth && (
            <div className="grid md:grid-cols-2 gap-5">
              <section className="border rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Recent Donations</h3>
                <div className="space-y-2 max-h-80 overflow-auto">
                  {donations.slice(0, 12).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.contact?.firstName} {d.contact?.lastName}</p>
                        <p className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString()} · {d.type}</p>
                      </div>
                      <b className="text-sm text-brand-700">${Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                    </div>
                  ))}
                  {!donations.length && <p className="text-sm text-gray-400">No donations yet.</p>}
                </div>
              </section>
              <section className="border rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
                <p className="text-sm text-gray-500 mb-4">Use the buttons above to review monthly totals, see all users, or add a donation.</p>
                <button onClick={() => setView("users")} className="w-full text-left border rounded-lg px-3 py-3 hover:bg-gray-50">
                  <b className="text-sm">View all users / contacts</b>
                  <p className="text-xs text-gray-400 mt-1">See each person in this group and add a donation for them.</p>
                </button>
              </section>
            </div>
          )}

          {view === "months" && !selectedMonth && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Monthly Totals</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {months.map((m) => (
                  <button key={m.key} onClick={() => { setSelectedMonth(m.key); setView("summary"); }}
                    className="text-left border rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50/40">
                    <p className="text-sm font-medium text-gray-700">{m.label}</p>
                    <p className="text-xl font-bold text-brand-700 mt-1">${m.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.count} donation{m.count === 1 ? "" : "s"} · Click to see details</p>
                  </button>
                ))}
                {!months.length && <p className="text-sm text-gray-400">No donations have been recorded.</p>}
              </div>
            </div>
          )}

          {view === "users" && !selectedMonth && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">All Users / Contacts</h3>
              <div className="divide-y border rounded-xl overflow-hidden">
                {contacts.map((c) => {
                  const raised = donations.filter((d) => d.contactId === c.id).reduce((sum, d) => sum + Number(d.amount || 0), 0);
                  return (
                    <div key={c.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50">
                      <button onClick={() => onContact(c)} className="text-left min-w-0">
                        <p className="font-medium text-gray-800">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-400">{c.email || c.phone || "No contact info"}</p>
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-700">${raised.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <button onClick={() => onAddDonation(c)} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">+ Donation</button>
                      </div>
                    </div>
                  );
                })}
                {!contacts.length && <p className="p-4 text-sm text-gray-400">No contacts in this group.</p>}
              </div>
            </div>
          )}

          {selectedMonth && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">
                {months.find((m) => m.key === selectedMonth)?.label || selectedMonth}
              </h3>
              <div className="bg-brand-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500">Raised this month</p>
                <p className="text-2xl font-bold text-brand-700">
                  ${monthDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="divide-y border rounded-xl overflow-hidden">
                {monthDonations.map((d) => (
                  <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{d.contact?.firstName} {d.contact?.lastName}</p>
                      <p className="text-xs text-gray-400">{new Date(d.date).toLocaleString()} · {d.type}</p>
                    </div>
                    <b className="text-brand-700">${Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
