import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function UserModal({ contacts, groups = [], user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "user",
    contactId: user?.contactId || "",
    groupId: user?.managedGroups?.[0]?.id || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        contactId: form.contactId || null,
        groupId: form.role === "manager" ? (form.groupId || null) : null,
      };
      if (user) await api.put(`/users/${user.id}`, payload);
      else {
        const r = await api.post("/users", payload);
        if (r.data?.warning) { setError(r.data.warning); return; }
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={user ? "Edit User" : "Add User"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Name">
          <input value={form.name} className={inputCls}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field label="Email">
          <input type="email" required disabled={!!user} value={form.email} className={inputCls}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>

        {!user && (
          <p className="text-xs text-gray-500 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
            The account will be created without a password. An invitation email will be sent so the user can securely set their password (or PIN for a donor/contact account).
          </p>
        )}

        <Field label="Role">
          <select value={form.role} className={inputCls}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User (donor)</option>
          </select>
        </Field>

        {form.role === "manager" && (
          <>
            <Field label="Link manager to group">
              <select value={form.groupId} className={inputCls}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Saving a group here makes this user the manager of that group. Any previous group assignment for this manager is removed.
            </p>
          </>
        )}

        {(form.role === "user" || form.role === "manager") && (
          <Field label="Link to contact (optional)">
            <select value={form.contactId} className={inputCls}
              onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </Field>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : user ? "Save Changes" : "Add User"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
