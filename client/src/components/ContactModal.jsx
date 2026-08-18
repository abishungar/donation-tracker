import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

// If `contact` is passed, this edits it. If `lockGroupId` is passed (manager view),
// the group select is hidden and fixed to that group.
export default function ContactModal({ contact, groups, lockGroupId, onClose, onSaved }) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    phone: contact?.phone || "",
    email: contact?.email || "",
    groupId: contact?.groupId ?? lockGroupId ?? "",
    active: contact?.active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, groupId: form.groupId || null };
      if (isEdit) {
        await api.put(`/contacts/${contact.id}`, payload);
      } else {
        await api.post("/contacts", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="First name">
            <input required value={form.firstName} className={inputCls}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input required value={form.lastName} className={inputCls}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Phone">
          <input value={form.phone} className={inputCls}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} className={inputCls}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        {!lockGroupId && (
          <Field label="Group">
            <select value={form.groupId} className={inputCls}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <input type="checkbox" checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        )}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
