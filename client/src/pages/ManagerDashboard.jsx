import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api";

export default function ManagerDashboard() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [error, setError] = useState("");

  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [donationForm, setDonationForm] = useState({ contactId: "", amount: "", date: "", type: "Online" });

  const myGroup = groups[0]; // a manager is expected to manage one group in this simple model

  function loadAll() {
    api.get("/groups").then((res) => setGroups(res.data)).catch(() => setError("Could not load group."));
    api.get("/contacts").then((res) => setContacts(res.data)).catch(() => {});
    api.get("/donations").then((res) => setDonations(res.data)).catch(() => {});
  }

  useEffect(loadAll, []);

  async function addContact(e) {
    e.preventDefault();
    if (!myGroup) return;
    try {
      await api.post("/contacts", { ...contactForm, groupId: myGroup.id });
      setContactForm({ firstName: "", lastName: "", phone: "", email: "" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add contact");
    }
  }

  async function addDonation(e) {
    e.preventDefault();
    if (!myGroup) return;
    try {
      await api.post("/donations", {
        ...donationForm,
        groupId: myGroup.id,
        amount: parseFloat(donationForm.amount),
      });
      setDonationForm({ contactId: "", amount: "", date: "", type: "Online" });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add donation");
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">My Group</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {myGroup && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 max-w-xs">
          <p className="text-sm text-gray-500">{myGroup.name} — Total Raised</p>
          <p className="text-3xl font-bold text-brand-700">
            ${myGroup.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contacts */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Contacts</h2>
          <form onSubmit={addContact} className="grid grid-cols-2 gap-2 mb-4">
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
            <button className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
              Add Contact
            </button>
          </form>
          <div className="max-h-72 overflow-y-auto text-sm divide-y">
            {contacts.map((c) => (
              <div key={c.id} className="py-2 flex justify-between">
                <span>{c.firstName} {c.lastName}</span>
                <span className={c.active ? "text-green-600" : "text-gray-400"}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {contacts.length === 0 && <p className="text-gray-400 py-2">No contacts yet.</p>}
          </div>
        </section>

        {/* Donations */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Log a Donation</h2>
          <form onSubmit={addDonation} className="grid grid-cols-2 gap-2 mb-4">
            <select required value={donationForm.contactId}
              onChange={(e) => setDonationForm({ ...donationForm, contactId: e.target.value })}
              className="border rounded px-2 py-1 text-sm col-span-2">
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
              className="border rounded px-2 py-1 text-sm col-span-2">
              <option>Online</option>
              <option>Cash</option>
              <option>Check</option>
              <option>In-Kind</option>
            </select>
            <button className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white rounded py-1.5 text-sm">
              Add Donation
            </button>
          </form>
          <div className="max-h-72 overflow-y-auto text-sm divide-y">
            {donations.map((d) => (
              <div key={d.id} className="py-2 flex justify-between">
                <span>{d.contact.firstName} {d.contact.lastName}</span>
                <span>${d.amount.toLocaleString()}</span>
              </div>
            ))}
            {donations.length === 0 && <p className="text-gray-400 py-2">No donations yet.</p>}
          </div>
        </section>
      </div>
    </Layout>
  );
}
