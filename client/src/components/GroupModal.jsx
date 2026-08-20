import React, { useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import ContactSearchSelect from "./ContactSearchSelect.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function GroupModal({ group, users, contacts, onClose, onSaved }) {
  const isEdit = !!group;
  const currentManager = users.find((u) => u.id === group?.managerId) || null;
  const currentMemberIds = useMemo(
    () => new Set((contacts || []).filter((c) => c.groupId === group?.id && c.active !== false).map((c) => c.id)),
    [contacts, group?.id]
  );

  const [form, setForm] = useState({
    name: group?.name || "",
    managerContactId: currentManager?.contactId || null,
  });
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [contactQuery, setContactQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const availableContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return (contacts || [])
      .filter((c) => c.active !== false)
      .filter((c) => !q || `${c.firstName} ${c.lastName} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [contacts, contactQuery]);

  function toggleContact(id) {
    setSelectedContactIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        managerContactId: form.managerContactId,
        // Only newly selected contacts are added/moved. Existing members are never
        // removed simply because they were not checked in this dialog.
        contactIds: selectedContactIds,
      };
      if (isEdit) await api.put(`/groups/${group.id}`, payload);
      else await api.post("/groups", payload);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || "Could not save group"); }
    finally { setSaving(false); }
  }

  const selectedManagerContact = (contacts || []).find((c) => c.id === form.managerContactId);

  return (
    <Modal title={isEdit ? "Edit Group" : "Add Group"} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <Field label="Group name">
          <input required value={form.name} className={inputCls}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field label="Group manager">
          {form.managerContactId ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
              <span>{selectedManagerContact ? `${selectedManagerContact.firstName} ${selectedManagerContact.lastName}` : "Selected"}</span>
              <button type="button" onClick={() => setForm({ ...form, managerContactId: null })} className="text-xs text-gray-500 hover:text-gray-800">Change</button>
            </div>
          ) : (
            <ContactSearchSelect contacts={contacts || []} value={form.managerContactId}
              onChange={(id) => setForm({ ...form, managerContactId: id })}
              placeholder="Search contact name..." />
          )}
        </Field>

        <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-800">Add contacts to this group</h3>
            <p className="text-xs text-gray-500 mt-1">Select active contacts to add or move into this group. Existing members remain unless changed elsewhere.</p>
          </div>
          <div className="p-3 border-b">
            <input value={contactQuery} onChange={(e) => setContactQuery(e.target.value)}
              placeholder="Search contacts by name, email, or phone..." className={inputCls} />
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {availableContacts.map((c) => {
              const current = currentMemberIds.has(c.id);
              const checked = current || selectedContactIds.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={checked} disabled={current}
                    onChange={() => !current && toggleContact(c.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email || c.phone || "No contact info"}{c.group?.name && !current ? ` · currently ${c.group.name}` : ""}</p>
                  </div>
                  {current && <span className="text-xs text-green-600 font-medium">Already in group</span>}
                </label>
              );
            })}
            {!availableContacts.length && <p className="px-4 py-6 text-sm text-gray-400 text-center">No active contacts found.</p>}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Group"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
