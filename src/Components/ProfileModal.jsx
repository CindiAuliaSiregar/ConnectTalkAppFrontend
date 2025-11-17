// src/Components/ProfileModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { updateProfile, updateAccount, deleteAccount } from '../api';

export default function ProfileModal({ setShowModal }) {
  const { user, login, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      // Update foto via API existing
      const res = await updateProfile({ profile_pic_url: data.publicUrl });
      login(localStorage.getItem('chat_token'), res.data.user);
      alert("Foto diperbarui!");
    } catch (err) { alert("Gagal upload"); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    try {
      const res = await updateAccount({ username, bio });
      login(localStorage.getItem('chat_token'), res.data.user);
      setIsEditing(false);
    } catch (err) { alert("Gagal update info"); }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt("Ketik 'HAPUS' untuk menghapus akun Anda secara permanen. Semua data akan hilang.");
    if (confirmText === 'HAPUS') {
      try {
        await deleteAccount();
        logout();
      } catch (err) { alert("Gagal menghapus akun"); }
    }
  };

  return (
    <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', zIndex:1100, display:'flex', justifyContent:'center', alignItems:'center'}}>
      <div style={{background:'white', width:'400px', padding:'20px', borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center'}}>
        <h3 style={{margin:'0 0 20px 0'}}>Profil Anda</h3>
        
        <div style={{position:'relative', marginBottom:'20px'}}>
           <img src={user.profile_pic_url || 'https://via.placeholder.com/100'} style={{width:'120px', height:'120px', borderRadius:'50%', objectFit:'cover'}} />
           <label style={{position:'absolute', bottom:0, right:0, background:'#008069', color:'white', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>
             📷 <input type="file" hidden onChange={handlePhotoUpload} disabled={uploading}/>
           </label>
        </div>

        <div style={{width:'100%'}}>
           <label style={{color:'#008069', fontSize:'12px', fontWeight:'bold'}}>Username</label>
           {isEditing ? (
             <input value={username} onChange={e=>setUsername(e.target.value)} style={{width:'100%', padding:'8px', marginBottom:'10px'}} />
           ) : (
             <div style={{marginBottom:'15px', fontSize:'16px'}}>{user.username}</div>
           )}

           <label style={{color:'#008069', fontSize:'12px', fontWeight:'bold'}}>Bio</label>
           {isEditing ? (
             <textarea value={bio} onChange={e=>setBio(e.target.value)} style={{width:'100%', padding:'8px', marginBottom:'10px'}} />
           ) : (
             <div style={{marginBottom:'20px', fontSize:'16px', color:'#555'}}>{user.bio || "Tidak ada bio"}</div>
           )}
        </div>

        <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px'}}>
           {isEditing ? (
             <>
                <button onClick={handleSave} style={{flex:1, padding:'10px', background:'#008069', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Simpan</button>
                <button onClick={()=>setIsEditing(false)} style={{flex:1, padding:'10px', background:'#ccc', border:'none', borderRadius:'5px', cursor:'pointer'}}>Batal</button>
             </>
           ) : (
             <>
                <button onClick={()=>setIsEditing(true)} style={{flex:1, padding:'10px', background:'#008069', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Edit Profil</button>
                <button onClick={()=>setShowModal(false)} style={{flex:1, padding:'10px', background:'#ccc', border:'none', borderRadius:'5px', cursor:'pointer'}}>Tutup</button>
             </>
           )}
        </div>

        {!isEditing && (
          <button onClick={handleDeleteAccount} style={{marginTop:'20px', color:'red', background:'none', border:'none', cursor:'pointer', fontSize:'12px'}}>
            Hapus Akun Saya
          </button>
        )}
      </div>
    </div>
  );
}