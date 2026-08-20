import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import SetPassword from "./pages/SetPassword.jsx";
import SetPin from "./pages/SetPin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import Logs from "./pages/Logs.jsx";
import Settings from "./pages/Settings.jsx";
import MainAdminPage from "./pages/MainAdminPage.jsx";

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function LoginNotice() {
  const { user } = useAuth(); const [notice,setNotice]=useState(null);
  useEffect(()=>{ try{ const raw=sessionStorage.getItem("loginNotice"); if(raw){setNotice(JSON.parse(raw));sessionStorage.removeItem("loginNotice");} }catch{} },[user]);
  if(!notice) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"><div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"><h2 className="text-xl font-semibold text-gray-900">{notice.title}</h2><div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{notice.body}</div><div className="mt-6 flex justify-end"><button onClick={()=>setNotice(null)} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl">Continue</button></div></div></div>;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "manager") return <Navigate to="/manager" replace />;
  return <Navigate to="/me" replace />;
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/set-pin" element={<SetPin />} />
      <Route path="/" element={<Home />} />
      <Route
        path="/admin"
        element={
          <Protected roles={["admin"]}>
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <Protected roles={["admin"]}>
            <Logs />
          </Protected>
        }
      />
      <Route
        path="/admin/main-admin"
        element={
          <Protected roles={["admin"]}>
            <MainAdminPage />
          </Protected>
        }
      />
      <Route
        path="/manager"
        element={
          <Protected roles={["manager"]}>
            <ManagerDashboard />
          </Protected>
        }
      />
      <Route
        path="/me"
        element={
          <Protected roles={["user"]}>
            <UserDashboard />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <LoginNotice />
    </>
  );
}
