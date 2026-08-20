import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import EmailSettingsModal from "../components/EmailSettingsModal.jsx";
import api from "../api";
import { Mail, ShieldCheck, Save, Pencil, Trash2, Users2 } from "lucide-react";
import ImportExportPanel from "../components/ImportExportPanel.jsx";
import GroupModal from "../components/GroupModal.jsx";
import ConfirmDelete from "../components/ConfirmDelete.jsx";

export default function MainAdminPage() {
  const [settings, setSettings] = useState({});
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groupModal, setGroupModal] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);

  async function loadGroups() {
    try {
      const [g, u, c] = await Promise.all([api.get("/groups"), api.get("/users"), api.get("/contacts")]);
      setGroups(g.data || []);
      setUsers(u.data || []);
      setContacts(c.data || []);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load groups");
    }
  }

  async function load() {
    try {
      const r = await api.get("/admin/settings");
      setSettings(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load Main Admin settings");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); loadGroups(); }, []);

  async function saveProtection() {
    setSaving(true); setError(""); setMessage("");
    try {
      await api.put("/admin/settings", {
        lock_main_admin: settings.lock_main_admin === "true" ? "true" : "false",
      });
      setMessage("Main Admin protection settings saved.");
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Could not save protection settings");
    } finally { setSaving(false); }
  }

  const locked = settings.lock_main_admin === "true";

  async function confirmDeleteGroup() {
    if (!deleteGroup) return;
    setError("");
    try {
      await api.delete(`/groups/${deleteGroup.id}`);
      setMessage(`Group "${deleteGroup.name}" deleted.`);
      setDeleteGroup(null);
      await loadGroups();
    } catch (e) {
      setError(e.response?.data?.error || "Could not delete group");
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Main Admin</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide administration and security settings.</p>
        </div>
        <ShieldCheck className="text-brand-600" size={30} />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {message && <p className="text-sm text-green-600 mb-4">{message}</p>}

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="space-y-5 max-w-4xl">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">Main Admin Protection</h2>
                <p className="text-sm text-gray-500 mt-1">Control who is allowed to assign or remove Main Admin privileges.</p>
              </div>
              <ShieldCheck className="text-brand-600" size={22} />
            </div>

            <label className="mt-5 flex items-start gap-3 p-4 rounded-xl border bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={locked}
                onChange={(e) => setSettings(s => ({ ...s, lock_main_admin: e.target.checked ? "true" : "false" }))}
              />
              <span>
                <span className="block font-medium text-gray-800">Require Main Admin protection</span>
                <span className="block text-sm text-gray-500 mt-1">
                  When enabled, only an existing Main Admin can change another user's Main Admin status.
                </span>
              </span>
            </label>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">Current status: <strong>{locked ? "Protected" : "Unprotected"}</strong></p>
              <button onClick={saveProtection} disabled={saving} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium">
                <Save size={15} className="inline mr-2" />{saving ? "Saving..." : "Save Protection"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">Group Management</h2>
                <p className="text-sm text-gray-500 mt-1">Main Admin can rename groups and permanently delete groups.</p>
              </div>
              <Users2 className="text-brand-600" size={22} />
            </div>
            <div className="mt-5 divide-y border rounded-xl overflow-hidden">
              {groups.map((g) => (
                <div key={g.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{g._count?.contacts || 0} contacts · {g.manager?.name || g.manager?.email || "No manager"} · ${Number(g.totalRaised || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} raised</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" onClick={() => setGroupModal(g)} className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium">
                      <Pencil size={15} /> Rename / Edit
                    </button>
                    <button type="button" onClick={() => setDeleteGroup({ id: g.id, name: g.name })} className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium">
                      <Trash2 size={15} /> Delete Group
                    </button>
                  </div>
                </div>
              ))}
              {!groups.length && <p className="p-4 text-sm text-gray-400">No groups yet.</p>}
            </div>
          </div>

          <ImportExportPanel />

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">Email / SMTP Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure and test the SMTP server used by the entire application.</p>
              </div>
              <Mail className="text-brand-600" size={22} />
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-gray-400">Server:</span> {settings.smtp_host}:{settings.smtp_port}</p>
              <p><span className="text-gray-400">Username:</span> {settings.smtp_user || "Not configured"}</p>
              <p><span className="text-gray-400">Security:</span> {String(settings.smtp_secure) === "true" || settings.smtp_secure === "1" ? "SSL/TLS" : "STARTTLS"}</p>
              <p><span className="text-gray-400">From:</span> {settings.smtp_from || settings.smtp_user || "Not configured"}</p>
            </div>
            <button onClick={() => setEmailOpen(true)} className="mt-5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium">
              <Mail size={15} className="inline mr-2" />Open Email Settings
            </button>
          </div>
        </div>
      )}

      {emailOpen && <EmailSettingsModal onClose={() => { setEmailOpen(false); load(); }} />}
      {groupModal && (
        <GroupModal
          group={groupModal}
          users={users}
          contacts={contacts}
          onClose={() => setGroupModal(null)}
          onSaved={async () => { setGroupModal(null); await loadGroups(); setMessage("Group updated."); }}
        />
      )}
      {deleteGroup && (
        <ConfirmDelete
          title="Delete Group?"
          message={`This permanently deletes "${deleteGroup.name}". Any attached contacts or donations may prevent deletion. This action cannot be undone.`}
          onCancel={() => setDeleteGroup(null)}
          onConfirm={confirmDeleteGroup}
        />
      )}
    </Layout>
  );
}
