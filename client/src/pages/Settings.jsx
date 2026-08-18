import React, { useState } from "react";
import Layout from "../components/Layout.jsx";
import { Field, inputCls, PrimaryButton } from "../components/FormBits.jsx";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await api.put("/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Account Settings</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md mb-6">
        <p className="text-sm text-gray-500">Signed in as</p>
        <p className="text-gray-800 font-medium">{user?.name || user?.email}</p>
        <p className="text-xs text-gray-400">{user?.email} · {user?.role}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md">
        <h2 className="font-medium text-gray-700 mb-4">Change Password</h2>
        <form onSubmit={handleSubmit}>
          <Field label="Current password">
            <input type="password" required value={currentPassword} className={inputCls}
              onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password">
            <input type="password" required minLength={6} value={newPassword} className={inputCls}
              onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" required value={confirmPassword} className={inputCls}
              onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mb-3">{success}</p>}
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Password"}
          </PrimaryButton>
        </form>
      </div>
    </Layout>
  );
}
