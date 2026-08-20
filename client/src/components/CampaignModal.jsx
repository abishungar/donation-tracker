import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, inputCls, PrimaryButton } from "./FormBits.jsx";
import api from "../api";

export default function CampaignModal({ campaign, onClose, onSaved }) {
  const [name,setName]=useState(campaign?.name||"");
  const [description,setDescription]=useState(campaign?.description||"");
  const [active,setActive]=useState(campaign?.active!==false);
  const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
  async function submit(e){e.preventDefault();setError("");setSaving(true);try{const payload={name,description,active}; if(campaign) await api.put(`/campaigns/${campaign.id}`,payload); else await api.post("/campaigns",payload);onSaved();}catch(err){setError(err.response?.data?.error||"Could not save campaign")}finally{setSaving(false)}}
  return <Modal title={campaign?"Edit Campaign":"Add Campaign"} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="Campaign name"><input required value={name} onChange={e=>setName(e.target.value)} className={inputCls} placeholder="e.g. Building Fund 2026"/></Field>
      <Field label="Description"><textarea value={description} onChange={e=>setDescription(e.target.value)} className={inputCls+" min-h-24"} placeholder="Optional description"/></Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 mb-4"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Active campaign (available when recording donations)</label>
      {error&&<p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button><PrimaryButton disabled={saving}>{saving?"Saving...":campaign?"Save Changes":"Add Campaign"}</PrimaryButton></div>
    </form>
  </Modal>
}
