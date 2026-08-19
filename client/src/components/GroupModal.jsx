import React, { useState } from "react";
import Modal from "./Modal.jsx";
import ContactSearchSelect from "./ContactSearchSelect.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

// Manager is picked by searching Contacts (by name), not typed in directly.
// `users` is the full user list, so we can find/reuse any existing account
// (of any role) already linked to the chosen contact, or create a fresh
// manager account for them if none exists yet.
export default function GroupModal({ group, users, contacts, onClose, onSaved }) {
  const isEdit = !!group;
  const currentManager = users.find((u) => u.id === group?.managerId) || null;

  const [form, setForm] = useState({
    name: group?.name || "",
    managerContactId: currentManager?.contactId || null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const payload = { name: form.name, managerContactId: form.managerContactId };
      if (isEdit) await api.put(`/groups/${group.id}`, payload);
      else await api.post("/groups", payload);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || "Could not save group"); }
    finally { setSaving(false); }
  }

  const selectedContact = contacts.find((c) => c.id === form.managerContactId);

  return (
    <Modal title={isEdit ? "Edit Group" : "Add Group"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Group name">
          <input required value={form.name} className={inputCls}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Manager (search contacts by name)">
          {form.managerContactId ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
              <span>{selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : "Selected"}</span>
              <button type="button" onClick={() => setForm({ ...form, managerContactId: null })} className="text-xs text-gray-500 hover:text-gray-800">
                Change
              </button>
            </div>
          ) : (
            <ContactSearchSelect
              contacts={contacts}
              value={form.managerContactId}
              onChange={(id) => setForm({ ...form, managerContactId: id })}
              placeholder="Search contact name..."
            />
          )}
        </Field>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Group"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
