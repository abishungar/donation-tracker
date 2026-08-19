import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function GroupModal({ group, users = [], onClose, onSaved }) {
  const isEdit = !!group;
  const managers = users.filter((u) => u.role === "manager");
  const [form, setForm] = useState({ name: group?.name || "", managerId: group?.managerId || "" });
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function handleSubmit(e) { e.preventDefault(); setError(""); setSaving(true); try {
    const payload = { name: form.name, managerId: form.managerId ? Number(form.managerId) : null };
    if (isEdit) await api.put(`/groups/${group.id}`, payload); else await api.post("/groups", payload); onSaved();
  } catch (err) { setError(err.response?.data?.error || "Could not save group"); } finally { setSaving(false); } }
  return <Modal title={isEdit ? "Edit Group" : "Add Group"} onClose={onClose}>
    <form onSubmit={handleSubmit}>
      <Field label="Group name"><input required value={form.name} className={inputCls} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label="Manager login">
        <select value={form.managerId} className={inputCls} onChange={e=>setForm({...form,managerId:e.target.value})}>
          <option value="">No manager assigned</option>
          {managers.map(m=><option key={m.id} value={m.id}>{m.name || m.email} — {m.email}</option>)}
        </select>
        {managers.length===0 && <p className="text-xs text-gray-500 mt-2">Create a user with the Manager role first. A manager login can then be assigned to this group.</p>}
      </Field>
      {error&&<p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex gap-2 justify-end pt-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button><PrimaryButton type="submit" disabled={saving}>{saving?"Saving...":isEdit?"Save Changes":"Add Group"}</PrimaryButton></div>
    </form>
  </Modal>;
}
