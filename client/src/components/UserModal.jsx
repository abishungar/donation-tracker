import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function UserModal({ contacts, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", contactId: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/users", { ...form, contactId: form.contactId || null });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Name">
          <input value={form.name} className={inputCls} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" required value={form.email} className={inputCls}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" required value={form.password} className={inputCls}
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
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add User"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
