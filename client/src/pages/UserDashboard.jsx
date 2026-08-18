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
      <h1 className="text-2xl font-semibold mb-6">My Giving</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!data && !error && <p className="text-gray-500">Loading...</p>}
      {data && (
        <>
          <div className="bg-white rounded-xl shadow p-6 mb-6 max-w-xs">
            <p className="text-sm text-gray-500">Total Raised</p>
            <p className="text-3xl font-bold text-brand-700">
              ${data.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.donations.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="p-3">${d.amount.toLocaleString()}</td>
                    <td className="p-3">{d.type}</td>
                  </tr>
                ))}
                {data.donations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-gray-400 text-center">
                      No donations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
