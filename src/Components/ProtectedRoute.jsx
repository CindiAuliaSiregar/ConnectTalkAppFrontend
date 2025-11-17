// src/components/ProtectedRoute.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const { token } = useAuth(); // Cek apakah ada token

  // Jika ada token, tampilkan halaman (Outlet)
  // Jika tidak, lempar kembali ke halaman login
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}