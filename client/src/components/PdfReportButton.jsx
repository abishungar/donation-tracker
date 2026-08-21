import React, { useState } from "react";
import api from "../api";
import { FileText, Printer } from "lucide-react";

export default function PdfReportButton({ url, label = "PDF Report", className = "", icon = "file" }) {
  const [loading, setLoading] = useState(false);
  async function openReport(e) {
    e?.stopPropagation();
    if (loading) return;
    // Open a tab immediately from the user click so popup blockers do not interfere.
    const win = window.open("about:blank", "_blank");
    if (!win) { alert("Please allow pop-ups for this website to view the PDF report."); return; }
    win.document.title = "Preparing report…";
    win.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;padding:40px;text-align:center;color:#374151">Preparing your report…</div>';
    setLoading(true);
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      win.location.href = blobUrl;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
    } catch (err) {
      win.close();
      const text = await err.response?.data?.text?.().catch(() => null);
      alert(text || err.response?.data?.error || "Could not create PDF report.");
    } finally { setLoading(false); }
  }
  const Icon = icon === "print" ? Printer : FileText;
  return <button type="button" onClick={openReport} disabled={loading} className={className || "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"}><Icon size={15}/>{loading ? "Creating…" : label}</button>;
}
