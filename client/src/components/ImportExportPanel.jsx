import React, { useRef, useState } from "react";
import { Download, Upload, FileJson, FileSpreadsheet } from "lucide-react";
import api from "../api";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function contactsToCsv(contacts = []) {
  const headers = ["firstName", "lastName", "phone", "email", "group", "active"];
  const rows = contacts.map(c => [
    c.firstName,
    c.lastName,
    c.phone || "",
    c.email || "",
    c.group?.name || "",
    c.active !== false ? "true" : "false",
  ]);
  return [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ""; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some(v => v !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(v => String(v || "").trim() !== "")).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
}

export default function ImportExportPanel() {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function exportData(format) {
    setBusy(true); setMessage(""); setError("");
    try {
      const r = await api.get("/admin/export");
      const data = r.data || {};
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `donation-tracker-backup-${stamp}.json`);
      } else {
        const csv = contactsToCsv(data.contacts || []);
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `donation-tracker-contacts-${stamp}.csv`);
      }
      setMessage(format === "json" ? "Full backup exported." : "Contacts CSV exported.");
    } catch (e) {
      setError(e.response?.data?.error || "Could not export data.");
    } finally { setBusy(false); }
  }

  async function importFile(file) {
    if (!file) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const text = await file.text();
      let rows;
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.contacts) ? parsed.contacts.map(c => ({
          firstName: c.firstName, lastName: c.lastName, phone: c.phone || "", email: c.email || "", group: c.group?.name || "", active: c.active !== false
        })) : []);
      } else {
        rows = parseCsv(text);
      }
      if (!rows.length) throw new Error("No importable contact rows were found.");
      const r = await api.post("/admin/import", { rows });
      setMessage(`Import complete. ${r.data?.created ?? 0} contact(s) processed.`);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Could not import data.");
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-800">Import & Export</h2>
          <p className="text-sm text-gray-500 mt-1">Back up your data or import contacts from a previous tracker export.</p>
        </div>
        <FileJson className="text-brand-600" size={22} />
      </div>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button disabled={busy} onClick={() => exportData("json")} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50">
          <Download size={17} className="inline mr-2 text-brand-600" />
          <span className="font-medium">Export Full Backup</span>
          <span className="block text-xs text-gray-400 mt-1">JSON with contacts, groups, users and donations.</span>
        </button>
        <button disabled={busy} onClick={() => exportData("csv")} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50">
          <FileSpreadsheet size={17} className="inline mr-2 text-brand-600" />
          <span className="font-medium">Export Contacts CSV</span>
          <span className="block text-xs text-gray-400 mt-1">Easy to edit in Excel or Google Sheets.</span>
        </button>
        <button disabled={busy} onClick={() => inputRef.current?.click()} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50">
          <Upload size={17} className="inline mr-2 text-brand-600" />
          <span className="font-medium">Import Contacts</span>
          <span className="block text-xs text-gray-400 mt-1">CSV or a JSON backup containing contacts.</span>
        </button>
        <input ref={inputRef} type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={e => importFile(e.target.files?.[0])} />
      </div>

      {busy && <p className="text-sm text-gray-500 mt-4">Processing...</p>}
      {message && <p className="text-sm text-green-600 mt-4">{message}</p>}
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <p className="text-xs text-gray-400 mt-4">Import currently adds contacts and creates missing groups. It does not overwrite existing contacts, users, or donations.</p>
    </div>
  );
}
