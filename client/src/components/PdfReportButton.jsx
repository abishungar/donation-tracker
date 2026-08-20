import React, { useState } from "react";
import api from "../api";
import { FileText, Printer } from "lucide-react";

export default function PdfReportButton({ url, label = "PDF Report", className = "", icon = "file" }) {
  const [loading, setLoading] = useState(false);
  async function openReport(e) {
    e?.stopPropagation();
    if (loading) return;
    setLoading(true);
    const win = window.open("about:blank", "_blank");
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      if (win) win.location.href = blobUrl;
      else window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      const text = await err.response?.data?.text?.().catch(() => null);
      alert(text || err.response?.data?.error || "Could not create PDF report.");
    } finally { setLoading(false); }
  }
  const Icon = icon === "print" ? Printer : FileText;
  return <button type="button" onClick={openReport} disabled={loading} className={className || "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"}><Icon size={15}/>{loading ? "Creating…" : label}</button>;
}
