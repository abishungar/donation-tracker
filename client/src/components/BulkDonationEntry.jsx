import React, { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import ContactSearchSelect from "./ContactSearchSelect.jsx";
import { Plus, Check, Loader2, AlertCircle } from "lucide-react";
import api from "../api";

// A Google-Sheets-like grid: add as many rows as you like, each row auto-saves
// itself (debounced) as soon as it has a contact + amount + type filled in —
// no explicit "Save" button needed per row.
let rowSeq = 0;
function emptyRow() {
  return { key: `r${rowSeq++}`, contactId: null, amount: "", type: "Online", status: "idle" }; // idle | saving | saved | error
}

export default function BulkDonationEntry({ contacts, onClose, onAnySaved }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const timers = useRef({});

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, status: "idle" } : r)));
    scheduleSave(key, patch);
  }

  function scheduleSave(key, patch) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => saveRow(key, patch), 700);
  }

  async function saveRow(key, patch) {
    setRows((prev) => {
      const row = prev.find((r) => r.key === key);
      const merged = { ...row, ...patch };
      if (!merged.contactId || !merged.amount || parseFloat(merged.amount) <= 0) return prev;
      doSave(key, merged);
      return prev.map((r) => (r.key === key ? { ...r, status: "saving" } : r));
    });
  }

  async function doSave(key, row) {
    try {
      await api.post("/donations", {
        contactId: row.contactId,
        groupId: contacts.find((c) => c.id === row.contactId)?.groupId,
        amount: parseFloat(row.amount),
        type: row.type,
      });
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "saved" } : r)));
      onAnySaved?.();
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.key === key ? { ...r, status: "error", errorMsg: err.response?.data?.error || "Failed to save" } : r
        )
      );
    }
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  return (
    <Modal title="Bulk Add Donations" onClose={onClose} wide>
      <p className="text-xs text-gray-500 mb-3">
        Fill in a contact, amount, and type — each row saves automatically a moment after you finish typing.
        Date is set to today automatically.
      </p>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_110px_28px] gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">
          <span>Contact</span>
          <span>Amount</span>
          <span>Type</span>
          <span></span>
        </div>
        <div className="divide-y max-h-80 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_110px_110px_28px] gap-2 px-3 py-2 items-center">
              <ContactSearchSelect
                contacts={contacts}
                value={row.contactId}
                onChange={(id) => updateRow(row.key, { contactId: id })}
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0.00"
                />
              </div>
              <select
                value={row.type}
                onChange={(e) => updateRow(row.key, { type: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option>Online</option>
                <option>Cash</option>
                <option>Check</option>
                <option>In-Kind</option>
              </select>
              <div className="flex justify-center" title={row.status === "error" ? row.errorMsg : ""}>
                {row.status === "saving" && <Loader2 size={15} className="animate-spin text-gray-400" />}
                {row.status === "saved" && <Check size={15} className="text-green-600" />}
                {row.status === "error" && <AlertCircle size={15} className="text-red-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={addRow}
        className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
        type="button"
      >
        <Plus size={15} /> Add row
      </button>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Done
        </button>
      </div>
    </Modal>
  );
}
