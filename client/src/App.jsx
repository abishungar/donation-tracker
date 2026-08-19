import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import SetPassword from "./pages/SetPassword.jsx";
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

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "manager") return <Navigate to="/manager" replace />;
  return <Navigate to="/me" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
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
  );
}
