import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api";

export default function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/logs").then((res) => setLogs(res.data)).catch(() => {});
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Activity Logs</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left border-b">
            <tr>
              <th className="p-3 font-medium text-gray-500">When</th>
              <th className="p-3 font-medium text-gray-500">User</th>
              <th className="p-3 font-medium text-gray-500">Action</th>
              <th className="p-3 font-medium text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="p-3 whitespace-nowrap text-gray-600">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-3 text-gray-600">{l.userEmail || "—"}</td>
                <td className="p-3 text-gray-800 font-medium">{l.action}</td>
                <td className="p-3 text-gray-400 max-w-xs break-words">{l.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-gray-400 text-center">No activity yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
