import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api";

export default function UserDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/reports/my-total")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load your giving history."));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">My Giving</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!data && !error && <p className="text-gray-400">Loading...</p>}
      {data && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 max-w-xs">
            <p className="text-sm text-gray-500">Total Raised</p>
            <p className="text-3xl font-bold text-brand-700">
              ${data.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b">
              <h3 className="font-medium text-gray-700 text-sm">Donation History</h3>
            </div>
            <div className="divide-y">
              {data.donations.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">{new Date(d.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{d.type}</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">${d.amount.toLocaleString()}</span>
                </div>
              ))}
              {data.donations.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400 text-center">No donations recorded yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
