import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Menu, X, LogOut, LayoutDashboard, Users2, ScrollText, HeartHandshake, Settings as SettingsIcon } from "lucide-react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = [];
  if (user?.role === "admin") {
    links.push(
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/logs", label: "Activity Logs", icon: ScrollText }
    );
  }
  if (user?.role === "manager") {
    links.push({ to: "/manager", label: "My Group", icon: Users2 });
  }
  if (user?.role === "user") {
    links.push({ to: "/me", label: "My Giving", icon: HeartHandshake });
  }
  links.push({ to: "/settings", label: "Settings", icon: SettingsIcon });

  const displayName = user?.name || user?.email;

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <HeartHandshake size={18} className="text-white" />
        </div>
        <span className="font-semibold text-white">Donation Tracker</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          const active = location.pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-gray-400 truncate">{displayName}</p>
        <p className="text-[11px] text-gray-500 capitalize mb-3">{user?.role}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen sm:flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex sm:w-64 sm:flex-shrink-0 bg-gray-900">{SidebarContent}</aside>

      {/* Mobile top bar */}
      <div className="sm:hidden sticky top-0 z-20 bg-gray-900 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <HeartHandshake size={15} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Donation Tracker</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-white p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-30 flex">
          <div className="w-72 bg-gray-900 h-full">
            <div className="flex justify-end px-3 pt-3">
              <button onClick={() => setOpen(false)} className="text-white p-1">
                <X size={20} />
              </button>
            </div>
            {SidebarContent}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
