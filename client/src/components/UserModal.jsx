import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function UserModal({ contacts, user, onClose, onSaved }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name||"", email: user?.email||"", password: "", role: user?.role||"user", contactId: user?.contactId||"", isMainAdmin:!!user?.isMainAdmin });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (user) await api.put(`/users/${user.id}`, { ...form, contactId: form.contactId || null });
      else await api.post("/users", { ...form, contactId: form.contactId || null });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={user ? "Edit User" : user ? "Save Changes" : "Add User"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Name">
          <input value={form.name} className={inputCls} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" required disabled={!!user} value={form.email} className={inputCls}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={user ? "New Password (leave blank to keep current)" : "Password"}>
          <input type="password" required={!user} value={form.password} className={inputCls}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Role">
          <select value={form.role} className={inputCls} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User (donor)</option>
          </select>
        </Field>
        {form.role === "user" && (
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
        {form.role === "admin" && <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" disabled={!currentUser?.isMainAdmin} checked={form.isMainAdmin} onChange={e=>setForm({...form,isMainAdmin:e.target.checked})}/> Main Admin{!currentUser?.isMainAdmin && <span className="text-xs text-gray-400">(Main Admin only)</span>}</label>}
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
