// src/components/AddContactModal.jsx
import React, { useState } from 'react';
import { addContact } from '../api';

export default function AddContactModal({ setShowModal, onContactAdded }) {
  const [customId, setCustomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await addContact({ 
        custom_id: customId, 
        display_name: displayName 
      });
      setSuccess(response.data.message);
      onContactAdded(); // Beri tahu ChatPage untuk refresh daftar
      // Kosongkan form setelah 1 detik
      setTimeout(() => {
        setCustomId('');
        setDisplayName('');
        setShowModal(false); // Tutup modal
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambah kontak');
    }
  };

  // Style untuk modal (sederhana)
  const modalStyle = {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white', padding: '20px',
    borderRadius: '8px', zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  };
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99
  };

  return (
    <>
      <div style={overlayStyle} onClick={() => setShowModal(false)}></div>
      <div style={modalStyle}>
        <h3>Tambah Kontak Baru</h3>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {success && <p style={{ color: 'green' }}>{success}</p>}
          <div style={{ marginBottom: '10px' }}>
            <label>ID Kustom Pengguna:</label><br />
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Nama Tampilan (Nama Panggilan):</label><br />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <button type="submit">Tambah</button>
          <button type="button" onClick={() => setShowModal(false)} style={{ marginLeft: '10px' }}>Batal</button>
        </form>
      </div>
    </>
  );
}