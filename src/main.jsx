// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate // Kita tambahkan Navigate
} from 'react-router-dom';

// Impor Halaman
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage'; // Impor Halaman Chat

// Impor Context & Pelindung
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // Gunakan pelindung di sini
    children: [
      {
        path: '/', // Rute default jika sudah login
        element: <Navigate to="/chat" replace />,
      },
      {
        path: '/chat', // Halaman chat kita
        element: <ChatPage />,
      },
      // Rute terlindungi lainnya bisa ditambahkan di sini
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Bungkus RouterProvider dengan AuthProvider */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);