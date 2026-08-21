import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import ContactModal from "../components/ContactModal.jsx";
import DonationModal from "../components/DonationModal.jsx";
import ContactDetailModal from "../components/ContactDetailModal.jsx";
import BulkDonationEntry from "../components/BulkDonationEntry.jsx";
import api from "../api";
import { HeartHandshake, Pencil, Trash2, Rows3 } from "lucide-react";
import PdfReportButton from "../components/PdfReportButton.jsx";

export default function ManagerDashboard() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [myDonations, setMyDonations] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const myGroup = groups[0]; // a manager is expected to manage one group in this simple model

  function loadAll() {
    api.get("/groups").then((res) => setGroups(res.data)).catch(() => setError("Could not load group."));
    api.get("/contacts").then((res) => setContacts(res.data)).catch(() => {});
    api.get("/donations").then((res) => setDonations(res.data)).catch(() => {});
    api.get("/campaigns").then((res) => setCampaigns(res.data)).catch(() => {});
    api.get("/reports/my-total").then((res) => setMyDonations(res.data)).catch(() => setMyDonations({ totalRaised: 0, donations: [] }));
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

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{myGroup ? myGroup.name : "My Group"}</h1>
        {myGroup && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal({ type: "bulkDonation" })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-brand-300"
            >
              <Rows3 size={15} /> Bulk Add Donations
            </button>
            <PdfReportButton url={`/reports/groups/${myGroup.id}/pdf`} label="Group PDF" allowPeriod />
            <PdfReportButton url="/reports/contacts/pdf" label="All Donations PDF" allowPeriod />
            <button
              onClick={() => setModal({ type: "donation" })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
            >
              <HeartHandshake size={15} /> Add Donation
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {!myGroup && (
        <p className="text-gray-400">You haven't been assigned to a group yet — ask an admin to assign you as a manager.</p>
      )}

      {myGroup && (
        <>
          {myDonations && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">My Recent Donations</p>
                  <p className="text-xs text-gray-400">Your donations as the contact linked to this manager account.</p>
                </div>
                <p className="text-lg font-bold text-brand-700">${Number(myDonations.totalRaised || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="divide-y border rounded-xl overflow-hidden">
                {(myDonations.donations || []).slice(0, 5).map(d => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div><p className="text-sm text-gray-700">{new Date(d.date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{d.type}{d.campaign?.name ? ` · ${d.campaign.name}` : ""}</p></div>
                    <span className="text-sm font-semibold text-brand-700">${Number(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {(!myDonations.donations || myDonations.donations.length === 0) && <p className="px-4 py-4 text-sm text-gray-400">No donations recorded for your linked contact.</p>}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 max-w-xs">
            <p className="text-sm text-gray-500">Total Raised</p>
            <p className="text-3xl font-bold text-brand-700">
              ${myGroup.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-700 text-sm">Contacts</h3>
              </div>
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {contacts.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => setModal({ type: "contactDetail", data: c })}
                        className="text-sm font-medium text-gray-800 hover:text-brand-600 truncate text-left"
                      >
                        {c.firstName} {c.lastName}
                      </button>
                      <p className="text-xs text-gray-400 truncate">{c.email || c.phone || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      <PdfReportButton url={`/reports/contacts/${c.id}/pdf`} label="PDF" allowPeriod className="text-xs text-gray-600 hover:text-brand-600 whitespace-nowrap" />
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
                {contacts.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No contacts yet.</p>}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-700 text-sm">Donations</h3>
              </div>
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {donations.map((d) => (
                  <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.contact.firstName} {d.contact.lastName}</p>
                      <p className="text-xs text-gray-400">{d.type} · {new Date(d.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-brand-700">${d.amount.toLocaleString()}</span>
                      <button onClick={() => setModal({ type: "editDonation", data: d })} className="text-gray-400 hover:text-brand-600">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {donations.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No donations yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}

      {modal?.type === "contact" && myGroup && (
        <ContactModal contact={modal.data} lockGroupId={myGroup.id} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "donation" && (
        <DonationModal
          contact={modal.data && modal.data.firstName ? modal.data : undefined}
          contacts={contacts}
          campaigns={campaigns}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
      {modal?.type === "editDonation" && (
        <DonationModal donation={modal.data} campaigns={campaigns} onClose={closeModal} onSaved={onSaved} />
      )}
      {modal?.type === "contactDetail" && (
        <ContactDetailModal contactId={modal.data.id} onClose={closeModal} />
      )}
      {modal?.type === "bulkDonation" && (
        <BulkDonationEntry contacts={contacts} campaigns={campaigns} onClose={closeModal} onAnySaved={loadAll} />
      )}
    </Layout>
  );
}
