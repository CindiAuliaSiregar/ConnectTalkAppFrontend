// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext'; // 1. Impor useAuth

export default function LoginPage() {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth(); // 2. Ambil fungsi login dari context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await loginUser({
        custom_id: customId,
        password: password,
      });

      // 3. Ambil data dari respons
      const { token, user } = response.data;

      // 4. Panggil fungsi login dari context!
      login(token, user); 

      // 5. Arahkan ke halaman chat
      navigate('/chat'); 

    } catch (err) {
      const message = err.response?.data?.message || 'Login gagal.';
      setError(message);
      console.error(err);
    }
  };


  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Login ke Akun Anda</h2>
      <form onSubmit={handleSubmit}>
        {/* Tampilkan pesan error jika ada */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* ... sisa input form tidak berubah ... */}
        <div style={{ marginBottom: '10px' }}>
          <label>Nomor ID:</label><br />
          <input
            type="text"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Kata Sandi:</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Login
        </button>
      </form>
      <p style={{ marginTop: '20px' }}>
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </div>
  );
}