import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import api from "../api";

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/analytics").then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-gray-400">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Raised</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">
            ${data.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Donations Logged</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{data.donationCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Raised by Group</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byGroup}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top Contacts</h3>
          <div className="space-y-3">
            {data.topContacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{i + 1}. {c.name}</span>
                <span className="font-semibold text-brand-700">${c.total.toLocaleString()}</span>
              </div>
            ))}
            {data.topContacts.length === 0 && <p className="text-sm text-gray-400">No donations yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
