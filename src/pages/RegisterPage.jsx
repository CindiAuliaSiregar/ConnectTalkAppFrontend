// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Impor useNavigate
import { registerUser } from '../api'; // Impor fungsi API kita

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // Untuk pesan error
  const navigate = useNavigate(); // Hook untuk pindah halaman

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Bersihkan error lama

    try {
      const response = await registerUser({
        username: username,
        custom_id: customId,
        password: password,
      });

      console.log(response.data); // "Registrasi berhasil"
      alert('Registrasi berhasil! Silakan login.'); // Beri notif
      navigate('/login'); // Arahkan ke halaman login

    } catch (err) {
      // Tangkap error dari server
      const message = err.response?.data?.message || 'Registrasi gagal.';
      setError(message);
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Buat Akun Baru</h2>
      <form onSubmit={handleSubmit}>
        {/* Tampilkan pesan error jika ada */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* ... sisa input form tidak berubah ... */}
        <div style={{ marginBottom: '10px' }}>
          <label>Nama (Username):</label><br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Nomor ID (4-14 angka):</label><br />
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
          Daftar
        </button>
      </form>
      <p style={{ marginTop: '20px' }}>
        Sudah punya akun? <Link to="/login">Login di sini</Link>
      </p>
    </div>
  );
}