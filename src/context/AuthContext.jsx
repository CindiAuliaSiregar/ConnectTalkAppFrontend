// src/context/AuthContext.jsx (VERSI LENGKAP DIPERBAIKI)
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Buat Context
const AuthContext = createContext();

// 2. Buat "Penyedia" (Provider)
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Status loading

  // --- PERBAIKAN 1: useEffect ---
  // Cek token DAN user saat aplikasi pertama kali dimuat
  useEffect(() => {
    const storedToken = localStorage.getItem('chat_token');
    const storedUser = localStorage.getItem('chat_user'); // <-- AMBIL USER
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser)); // <-- SET USER
    }
    setLoading(false);
  }, []);

  // --- PERBAIKAN 2: login ---
  const login = (newToken, userData) => {
    localStorage.setItem('chat_token', newToken);
    localStorage.setItem('chat_user', JSON.stringify(userData)); // <-- SIMPAN USER
    setToken(newToken);
    setUser(userData);
  };

  // --- PERBAIKAN 3: logout ---
  const logout = () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user'); // <-- HAPUS USER
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Buat "Hook" kustom (tidak berubah)
export const useAuth = () => {
  return useContext(AuthContext);
};