// src/Components/ContactInfoModal.jsx
import React, { useState } from 'react';
import { updateContact, deleteContact } from '../api';

export default function ContactInfoModal({ contact, onClose, onUpdate, onDeleteChat }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(contact.display_name);

  const handleSaveName = async () => {
    try {
      await updateContact(contact.contact_table_id, newName); // Pastikan ID tabel kontak
      setIsEditing(false);
      onUpdate();
    } catch (err) { alert("Gagal update nama"); }
  };

  const handleDeleteContact = async () => {
    if(!confirm("Hapus kontak ini? Chat tidak akan hilang, tapi nama akan kembali ke username asli.")) return;
    try {
      await deleteContact(contact.contact_table_id);
      onUpdate(); // Refresh list
      onClose(); // Tutup sidebar
    } catch (err) { alert("Gagal hapus"); }
  };

  return (
    <div style={{position:'fixed', top:0, right:0, width:'350px', height:'100%', background:'#fff', borderLeft:'1px solid #ddd', zIndex:1000, display:'flex', flexDirection:'column', boxShadow:'-2px 0 5px rgba(0,0,0,0.1)'}}>
       <div style={{height:'60px', background:'#f0f2f5', display:'flex', alignItems:'center', padding:'0 15px'}}>
           <button onClick={onClose} style={{border:'none', background:'transparent', fontSize:'16px', cursor:'pointer', marginRight:'15px'}}>✖</button>
           <span style={{fontSize:'16px'}}>Info Kontak</span>
       </div>

       <div style={{flex:1, overflowY:'auto', padding:'20px', textAlign:'center'}}>
          <img src={contact.profile_pic_url || 'https://via.placeholder.com/150'} style={{width:'150px', height:'150px', borderRadius:'50%', objectFit:'cover', marginBottom:'15px'}} />
          
          {/* Nama Tersimpan */}
          <div style={{marginBottom:'20px'}}>
             {isEditing ? (
                <div style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
                   <input value={newName} onChange={e=>setNewName(e.target.value)} style={{fontSize:'20px', border:'none', borderBottom:'2px solid #008069', textAlign:'center', width:'150px'}} />
                   <button onClick={handleSaveName} style={{border:'none', background:'transparent', cursor:'pointer', fontSize:'18px'}}>✅</button>
                </div>
             ) : (
                <h2 style={{margin:0, fontSize:'22px'}}>
                   {contact.display_name} 
                   <button onClick={()=>setIsEditing(true)} style={{border:'none', background:'transparent', cursor:'pointer', fontSize:'14px', marginLeft:'5px'}}>✏️</button>
                </h2>
             )}
             <div style={{color:'#667781'}}>~{contact.username}</div>
          </div>

          {/* Info Detail */}
          <div style={{textAlign:'left', background:'#f0f2f5', padding:'15px', borderRadius:'10px', marginBottom:'20px'}}>
             <div style={{fontSize:'12px', color:'#008069', fontWeight:'bold'}}>ID Pengguna</div>
             <div style={{marginBottom:'10px'}}>{contact.custom_id}</div>
             
             <div style={{fontSize:'12px', color:'#008069', fontWeight:'bold'}}>Info (Bio)</div>
             <div>{contact.bio || "Ada"}</div>
          </div>

          {/* Actions */}
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
             <button style={{padding:'10px', color:'#ea4335', background:'none', border:'1px solid #ddd', borderRadius:'5px', cursor:'pointer', textAlign:'left'}} onClick={()=>alert("Fitur Blokir (Simulasi)")}>
                🚫 Blokir {contact.display_name}
             </button>
             <button onClick={handleDeleteContact} style={{padding:'10px', color:'#ea4335', background:'none', border:'1px solid #ddd', borderRadius:'5px', cursor:'pointer', textAlign:'left'}}>
                🗑️ Hapus Kontak
             </button>
             <button onClick={onDeleteChat} style={{padding:'10px', color:'#ea4335', background:'none', border:'1px solid #ddd', borderRadius:'5px', cursor:'pointer', textAlign:'left'}}>
                🧹 Bersihkan Chat
             </button>
          </div>
       </div>
    </div>
  );
}