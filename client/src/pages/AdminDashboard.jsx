import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import ContactModal from "../components/ContactModal.jsx";
import GroupModal from "../components/GroupModal.jsx";
import DonationModal from "../components/DonationModal.jsx";
import UserModal from "../components/UserModal.jsx";
import api from "../api";
import {
  UserPlus, Users2, HeartHandshake, Pencil, Trash2, ShieldCheck,
} from "lucide-react";

const TABS = ["Overview", "Contacts", "Groups", "Donations", "Users"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null); // { type: 'contact'|'group'|'donation'|'user', data? }

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

  async function deleteContact(id) {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    try {
      await api.delete(`/contacts/${id}`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete contact");
    }
  }

  async function deleteUser(id) {
    if (!confirm("Delete this user account?")) return;
    try {
      await api.delete(`/users/${id}`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete user");
    }
  }

  const managers = users.filter((u) => u.role === "manager");

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

      {tab === "Contacts" && (
        <div className="space-y-6">
          {contactsByGroup.map(({ group, contacts: groupContacts }) => (
            <section key={group?.id ?? "none"} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-medium text-gray-700 text-sm">{group?.name || "No Group"}</h3>
                <span className="text-xs text-gray-400">{groupContacts.length} contact{groupContacts.length !== 1 && "s"}</span>
              </div>
              <div className="divide-y">
                {groupContacts.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email || c.phone || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => setModal({ type: "donation", data: c })}
                        className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                      >
                        + Donation
                      </button>
                      <button onClick={() => setModal({ type: "contact", data: c })} className="text-gray-400 hover:text-brand-600">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteContact(c.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {groupContacts.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No contacts here yet.</p>}
              </div>
            </section>
          ))}
          {contacts.length === 0 && <p className="text-gray-400">No contacts yet — add one to get started.</p>}
        </div>
      )}

      {tab === "Groups" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y">
          {groups.map((g) => (
            <div key={g.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{g.name}</p>
                <p className="text-xs text-gray-400">
                  Manager: {g.manager?.name || g.manager?.email || "Unassigned"} · ${g.totalRaised.toLocaleString()} raised
                </p>
              </div>
              <button onClick={() => setModal({ type: "group", data: g })} className="text-gray-400 hover:text-brand-600">
                <Pencil size={15} />
              </button>
            </div>
          ))}
          {groups.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No groups yet.</p>}
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
                <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-600">
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
        <GroupModal group={modal.data} managers={managers} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "donation" && (
        <DonationModal contact={modal.data && modal.data.firstName ? modal.data : undefined} contacts={contacts} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "editDonation" && (
        <DonationModal donation={modal.data} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "user" && (
        <UserModal contacts={contacts} onClose={closeModal} onSaved={onSaved} />
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
