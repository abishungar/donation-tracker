import React, { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loginNotice, setLoginNotice] = useState(() => { const raw=localStorage.getItem("loginNotice"); localStorage.removeItem("loginNotice"); return raw ? JSON.parse(raw) : null; });

  async function login(email, credential) {
    const payload = { email, credential };
    const res = await api.post("/auth/login", payload);
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    setLoginNotice(res.data.loginNotice || null);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginNotice");
    setUser(null); setLoginNotice(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loginNotice, clearLoginNotice:()=>setLoginNotice(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
