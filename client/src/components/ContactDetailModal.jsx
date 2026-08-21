import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import api from "../api";
import PdfReportButton from "./PdfReportButton.jsx";

export default function ContactDetailModal({ contactId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/contacts/${contactId}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load this contact's details."));
  }, [contactId]);

  return (
    <Modal title={data ? `${data.firstName} ${data.lastName}` : "Contact"} onClose={onClose} wide>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Loading...</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-gray-700">{data.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="text-gray-700">{data.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Group</p>
              <p className="text-gray-700">{data.group?.name || "No group"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <p className="text-gray-700">{data.active ? "Active" : "Inactive"}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Contact report</p>
              <p className="text-xs text-gray-400">Open a detailed donation report for this contact.</p>
            </div>
            <PdfReportButton url={`/reports/contacts/${data.id}/pdf`} label="Open PDF" allowPeriod />
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Raised</span>
            <span className="text-xl font-bold text-brand-700">
              ${data.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <h4 className="text-sm font-medium text-gray-700 mb-2">Donation History</h4>
          <div className="border border-gray-100 rounded-xl divide-y max-h-64 overflow-y-auto">
            {data.donations.map((d) => (
              <div key={d.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-700">{new Date(d.date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400">{d.type} · recorded under {d.group.name}</p>
                </div>
                <span className="font-semibold text-brand-700">${d.amount.toLocaleString()}</span>
              </div>
            ))}
            {data.donations.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-400 text-center">No donations recorded yet.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
