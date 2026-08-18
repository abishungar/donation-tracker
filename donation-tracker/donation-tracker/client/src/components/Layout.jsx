import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = [];
  if (user?.role === "admin") {
    links.push(
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/logs", label: "Activity Logs" }
    );
  }
  if (user?.role === "manager") {
    links.push({ to: "/manager", label: "My Group" });
  }
  if (user?.role === "user") {
    links.push({ to: "/me", label: "My Giving" });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-brand-700">Donation Tracker</div>
          <nav className="hidden sm:flex items-center gap-4">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-gray-600 hover:text-brand-700">
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <span className="text-sm text-gray-400">{user.email} ({user.role})</span>
                <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
                  Log out
                </button>
              </>
            )}
          </nav>
          <button
            className="sm:hidden text-gray-600"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="sm:hidden border-t bg-white px-4 py-3 flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <span className="text-xs text-gray-400">{user.email} ({user.role})</span>
                <button onClick={handleLogout} className="text-sm text-red-600 text-left">
                  Log out
                </button>
              </>
            )}
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
