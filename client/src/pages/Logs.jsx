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
      <h1 className="text-2xl font-semibold mb-6">Activity Logs</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-3">{l.userEmail || "—"}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3 text-gray-500 max-w-xs break-words">{l.details}</td>
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
