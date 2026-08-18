import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api";

const TABS = ["Overview", "Groups", "Users", "Contacts", "Donations"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [error, setError] = useState("");

  function loadAll() {
    api.get("/groups").then((r) => setGroups(r.data)).catch(() => {});
    api.get("/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get("/contacts").then((r) => setContacts(r.data)).catch(() => {});
    api.get("/donations").then((r) => setDonations(r.data)).catch(() => {});
  }
  useEffect(loadAll, []);

  // --- Forms state ---
  const [groupForm, setGroupForm] = useState({ name: "", managerId: "" });
  const [userForm, setUserForm] = useState({ email: "", password: "", role: "user", contactId: "" });
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "", groupId: "" });
  const [donationForm, setDonationForm] = useState({ contactId: "", groupId: "", amount: "", date: "", type: "Online" });

  async function submit(fn) {
    setError("");
    try {
      await fn();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              tab === t ? "bg-brand-600 text-white" : "bg-white border text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {tab === "Overview" && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow p-5">
              <p className="text-sm text-gray-500">{g.name}</p>
              <p className="text-2xl font-bold text-brand-700">
                ${g.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Manager: {g.manager?.email || "Unassigned"} · {g._count.contacts} contacts
              </p>
            </div>
          ))}
          {groups.length === 0 && <p className="text-gray-400">No groups yet.</p>}
        </div>
      )}

      {tab === "Groups" && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">Add Group</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  await api.post("/groups", {
                    name: groupForm.name,
                    managerId: groupForm.managerId || null,
                  });
                  setGroupForm({ name: "", managerId: "" });
                });
              }}
              className="space-y-2"
            >
              <input placeholder="Group name" required value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm" />
              <select value={groupForm.managerId}
                onChange={(e) => setGroupForm({ ...groupForm, managerId: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm">
                <option value="">No manager assigned</option>
                {users.filter((u) => u.role === "manager").map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
              <button className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
                Add Group
              </button>
            </form>
          </section>
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">All Groups</h2>
            <div className="max-h-80 overflow-y-auto text-sm divide-y">
              {groups.map((g) => (
                <div key={g.id} className="py-2 flex justify-between">
                  <span>{g.name}</span>
                  <span className="text-gray-500">{g.manager?.email || "—"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "Users" && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">Add User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  await api.post("/users", {
                    ...userForm,
                    contactId: userForm.contactId || null,
                  });
                  setUserForm({ email: "", password: "", role: "user", contactId: "" });
                });
              }}
              className="space-y-2"
            >
              <input placeholder="Email" type="email" required value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm" />
              <input placeholder="Password" type="password" required value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm" />
              <select value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User (donor)</option>
              </select>
              {userForm.role === "user" && (
                <select value={userForm.contactId}
                  onChange={(e) => setUserForm({ ...userForm, contactId: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">Link to contact (optional)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              )}
              <button className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
                Add User
              </button>
            </form>
          </section>
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">All Users</h2>
            <div className="max-h-80 overflow-y-auto text-sm divide-y">
              {users.map((u) => (
                <div key={u.id} className="py-2 flex justify-between items-center">
                  <span>{u.email}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{u.role}</span>
                    <button
                      onClick={() => submit(async () => api.delete(`/users/${u.id}`))}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "Contacts" && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">Add Contact</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  await api.post("/contacts", {
                    ...contactForm,
                    groupId: contactForm.groupId || null,
                  });
                  setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" });
                });
              }}
              className="grid grid-cols-2 gap-2"
            >
              <input placeholder="First name" required value={contactForm.firstName}
                onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <input placeholder="Last name" required value={contactForm.lastName}
                onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <input placeholder="Phone" value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <input placeholder="Email" value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <select value={contactForm.groupId}
                onChange={(e) => setContactForm({ ...contactForm, groupId: e.target.value })}
                className="col-span-2 border rounded px-2 py-1 text-sm">
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
                Add Contact
              </button>
            </form>
          </section>
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">All Contacts</h2>
            <div className="max-h-80 overflow-y-auto text-sm divide-y">
              {contacts.map((c) => (
                <div key={c.id} className="py-2 flex justify-between">
                  <span>{c.firstName} {c.lastName}</span>
                  <span className="text-gray-500">{c.group?.name || "No group"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "Donations" && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">Log Donation</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  await api.post("/donations", {
                    ...donationForm,
                    amount: parseFloat(donationForm.amount),
                  });
                  setDonationForm({ contactId: "", groupId: "", amount: "", date: "", type: "Online" });
                });
              }}
              className="grid grid-cols-2 gap-2"
            >
              <select required value={donationForm.contactId}
                onChange={(e) => {
                  const contact = contacts.find((c) => c.id === Number(e.target.value));
                  setDonationForm({
                    ...donationForm,
                    contactId: e.target.value,
                    groupId: contact?.groupId || "",
                  });
                }}
                className="col-span-2 border rounded px-2 py-1 text-sm">
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
              <input placeholder="Amount" type="number" step="0.01" required value={donationForm.amount}
                onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <input type="date" required value={donationForm.date}
                onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                className="border rounded px-2 py-1 text-sm" />
              <select value={donationForm.type}
                onChange={(e) => setDonationForm({ ...donationForm, type: e.target.value })}
                className="col-span-2 border rounded px-2 py-1 text-sm">
                <option>Online</option>
                <option>Cash</option>
                <option>Check</option>
                <option>In-Kind</option>
              </select>
              <button className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
                Add Donation
              </button>
            </form>
          </section>
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold mb-4">All Donations</h2>
            <div className="max-h-80 overflow-y-auto text-sm divide-y">
              {donations.map((d) => (
                <div key={d.id} className="py-2 flex justify-between">
                  <span>{d.contact.firstName} {d.contact.lastName}</span>
                  <span>${d.amount.toLocaleString()} · {d.group.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
