// src/Components/CreateGroupModal.jsx
import React, { useState, useEffect } from 'react';
import { getContacts, createGroup } from '../api';

export default function CreateGroupModal({ setShowModal, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    // Ambil daftar kontak untuk dipilih
    getContacts().then(res => setContacts(res.data));
  }, []);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName || selectedIds.length === 0) return alert("Isi nama dan pilih anggota!");

    try {
      await createGroup(groupName, selectedIds);
      onGroupCreated(); // Refresh daftar grup di ChatPage
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat grup");
    }
  };

  return (
    <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'white', padding:'20px', borderRadius:'8px', width:'300px', maxHeight:'80vh', overflowY:'auto'}}>
        <h3>Buat Grup Baru</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" placeholder="Nama Grup" value={groupName} onChange={e=>setGroupName(e.target.value)} 
            style={{width:'100%', padding:'8px', marginBottom:'15px', borderRadius:'5px', border:'1px solid #ccc'}}
          />
          
          <div style={{marginBottom:'15px'}}>
            <p style={{fontWeight:'bold'}}>Pilih Anggota:</p>
            {contacts.map(c => (
              <div key={c.id} onClick={() => toggleSelect(c.user_id)} 
                   style={{padding:'8px', borderBottom:'1px solid #eee', cursor:'pointer', background: selectedIds.includes(c.user_id) ? '#d9fdd3' : 'white'}}>
                {selectedIds.includes(c.user_id) ? '✅ ' : '⬜ '}
                {c.display_name}
              </div>
            ))}
          </div>

          <button type="submit" style={{width:'100%', padding:'10px', background:'#008069', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Buat Grup</button>
          <button type="button" onClick={()=>setShowModal(false)} style={{width:'100%', marginTop:'10px', padding:'10px', background:'#eee', border:'none', borderRadius:'5px', cursor:'pointer'}}>Batal</button>
        </form>
      </div>
    </div>
  );
}