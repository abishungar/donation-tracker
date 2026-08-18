import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

// Two modes:
//  - Add: pass `contact` (locked target) or `contacts` (picker list). Date is set
//    automatically by the server to "now" — no date field shown.
//  - Edit: pass `donation` (existing record). Only amount and type can change;
//    the contact, group, and original date stay fixed.
//
// The donation's groupId is always taken from the contact's CURRENT group at the
// moment it's created, and never changes afterward — even if the contact is later
// reassigned to a different group.
export default function DonationModal({ donation, contact, contacts = [], onClose, onSaved }) {
  const isEdit = !!donation;
  const [contactId, setContactId] = useState(contact?.id || "");
  const [amount, setAmount] = useState(donation?.amount?.toString() || "");
  const [type, setType] = useState(donation?.type || "Online");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedContact = contact || contacts.find((c) => c.id === Number(contactId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/donations/${donation.id}`, { amount: parseFloat(amount), type });
      } else {
        if (!selectedContact) {
          setError("Please select a contact");
          setSaving(false);
          return;
        }
        if (!selectedContact.groupId) {
          setError("This contact isn't assigned to a group yet — add them to a group first.");
          setSaving(false);
          return;
        }
        await api.post("/donations", {
          contactId: selectedContact.id,
          groupId: selectedContact.groupId,
          amount: parseFloat(amount),
          type,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save donation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Donation" : "Log a Donation"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {isEdit ? (
          <div className="mb-3 bg-gray-50 rounded-lg px-3 py-2 text-sm space-y-0.5">
            <p>
              <span className="text-gray-500">Contact:</span>{" "}
              <span className="font-medium">{donation.contact.firstName} {donation.contact.lastName}</span>
            </p>
            <p>
              <span className="text-gray-500">Group:</span>{" "}
              <span className="font-medium">{donation.group.name}</span>
            </p>
            <p>
              <span className="text-gray-500">Date entered:</span>{" "}
              <span className="font-medium">{new Date(donation.date).toLocaleString()}</span>
            </p>
          </div>
        ) : contact ? (
          <div className="mb-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500">Contact:</span>{" "}
            <span className="font-medium">{contact.firstName} {contact.lastName}</span>
          </div>
        ) : (
          <Field label="Contact">
            <select required value={contactId} className={inputCls}
              onChange={(e) => setContactId(e.target.value)}>
              <option value="">Select contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </Field>
        )}
        {!isEdit && selectedContact && (
          <p className="text-xs text-gray-400 mb-3">
            Will be recorded under group:{" "}
            <span className="font-medium text-gray-600">
              {selectedContact.group?.name || "— none —"}
            </span>{" "}
            (locked to this group even if the contact moves later). Date is set to today automatically.
          </p>
        )}
        <Field label="Amount">
          <input type="number" step="0.01" min="0" required value={amount} className={inputCls}
            onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Type">
          <select value={type} className={inputCls} onChange={(e) => setType(e.target.value)}>
            <option>Online</option>
            <option>Cash</option>
            <option>Check</option>
            <option>In-Kind</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Donation"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
