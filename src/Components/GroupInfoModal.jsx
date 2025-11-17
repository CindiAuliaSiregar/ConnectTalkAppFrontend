// src/Components/GroupInfoModal.jsx (FINAL SIDEBAR STYLE)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import socket from '../socket'; 
import { 
  getGroupMembers, updateGroupInfo, addGroupParticipants, 
  removeGroupParticipant, getContacts, toggleGroupAdmin, updateGroupSettings 
} from '../api';

export default function GroupInfoModal({ chat, setShowModal, onUpdate, allContacts }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState(chat.display_name);
  const [isEditingName, setIsEditingName] = useState(false);
  
  const [amIOwner, setAmIOwner] = useState(false);
  const [amISubAdmin, setAmISubAdmin] = useState(false);
  
  const [onlyAdminsMsg, setOnlyAdminsMsg] = useState(chat.only_admins_message || false);
  const [onlyAdminsEdit, setOnlyAdminsEdit] = useState(chat.only_admins_edit || false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [contactsList, setContactsList] = useState([]);

  const getDisplayName = (member) => {
    if (member.id === user.id) return "Anda";
    const saved = (allContacts||[]).find(c => c.id === member.id) || contactsList.find(c => c.id === member.id);
    if (saved) return saved.display_name;
    return member.username;
  };

  useEffect(() => { loadMembers(); fetchContactsList(); }, []);

  const fetchContactsList = async () => { try { const res=await getContacts(); setContactsList(res.data.map(c=>({...c, id:c.user_id}))); } catch(e){} };

  const loadMembers = async () => {
    try {
      const res = await getGroupMembers(chat.id);
      let data = res.data;
      
      // --- SORTING: ANDA DI ATAS ---
      data.sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return 0;
      });
      
      setMembers(data);
      const me = data.find(m => m.id === user.id);
      const isOwner = chat.created_by === user.id;
      setAmIOwner(isOwner);
      if (me && me.role === 'admin' && !isOwner) setAmISubAdmin(true);
      else setAmISubAdmin(false);
    } catch (err) { console.error(err); }
  };

  // ... (Fungsi handlePhotoUpload, handleNameSave, dll sama seperti kode sebelumnya, persis) ...
  // ... (Untuk menyingkat jawaban, saya asumsikan logic handler sama) ...
  const handleSettingChange = async (k, v) => { try { await updateGroupSettings(chat.id, {[k]:v}); if(k.includes('msg')) setOnlyAdminsMsg(v); else setOnlyAdminsEdit(v); socket.emit('groupSettingsUpdated', {chatId: chat.id}); onUpdate(); } catch(e){alert("Gagal");} };
  const handlePhotoUpload = async (e) => { const f=e.target.files[0]; if(!f)return; try{ const n=`g_${chat.id}_${Date.now()}`; const {error}=await supabase.storage.from('avatars').upload(n,f); if(error)throw error; const {data}=supabase.storage.from('avatars').getPublicUrl(n); await updateGroupInfo(chat.id,{groupIconUrl:data.publicUrl}); socket.emit('groupUpdated',{chatId:chat.id}); onUpdate(); }catch(e){alert("Gagal");} };
  const handleNameSave = async () => { try{ await updateGroupInfo(chat.id,{groupName}); socket.emit('groupUpdated',{chatId:chat.id}); setIsEditingName(false); onUpdate(); }catch(e){alert("Gagal");} };
  const handleRemoveMember = async (mid, mname) => { if(!confirm(`Keluarkan ${mname}?`))return; try{ await removeGroupParticipant(chat.id,mid); socket.emit('memberRemoved',{userId:mid, chatId:chat.id}); loadMembers(); }catch(e){alert("Gagal");} };
  const handleAddMember = async (cid) => { try{ await addGroupParticipants(chat.id,[cid]); socket.emit('memberAdded',{memberIds:[cid], chatId:chat.id}); setShowAddMember(false); loadMembers(); }catch(e){alert("Gagal");} };
  const handleToggleSubAdmin = async (mid, role) => { const nr = role==='admin'?'member':'admin'; if(!confirm("Ubah role?"))return; try{ await toggleGroupAdmin(chat.id,mid,nr); socket.emit('groupSettingsUpdated',{chatId:chat.id}); loadMembers(); }catch(e){alert("Gagal");} };

  const canManage = amIOwner || amISubAdmin;
  const canEdit = amIOwner || amISubAdmin || !onlyAdminsEdit;

  // STYLE SIDEBAR DARI KANAN
  return (
    <div style={{position:'fixed', top:0, right:0, width:'350px', height:'100%', background:'#fff', borderLeft:'1px solid #ddd', zIndex:1000, display:'flex', flexDirection:'column', boxShadow:'-2px 0 5px rgba(0,0,0,0.1)'}}>
        
        {/* Header Sidebar */}
        <div style={{height:'60px', background:'#f0f2f5', display:'flex', alignItems:'center', padding:'0 15px'}}>
           <button onClick={()=>setShowModal(false)} style={{border:'none', background:'transparent', fontSize:'16px', cursor:'pointer', marginRight:'15px'}}>✖</button>
           <span style={{fontSize:'16px'}}>Info Grup</span>
        </div>

        <div style={{flex:1, overflowY:'auto', paddingBottom:'20px'}}>
            {/* Foto & Nama */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'20px', background:'white', borderBottom:'10px solid #f0f2f5'}}>
                <div style={{position:'relative', marginBottom:'10px'}}>
                    <img src={chat.group_icon_url || "https://via.placeholder.com/150?text=Grup"} style={{width:'150px', height:'150px', borderRadius:'50%', objectFit:'cover'}} />
                    {canEdit && <label style={{position:'absolute', bottom:0, right:0, background:'#008069', color:'white', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>📷<input type="file" hidden onChange={handlePhotoUpload}/></label>}
                </div>
                <div style={{display:'flex', alignItems:'center'}}>
                    {isEditingName ? (
                        <><input value={groupName} onChange={e=>setGroupName(e.target.value)} style={{border:'none', borderBottom:'2px solid #008069', fontSize:'20px', textAlign:'center', width:'200px'}} /><button onClick={handleNameSave}>✅</button></>
                    ) : (
                        <><h2 style={{margin:0, fontSize:'22px'}}>{groupName}</h2>{canEdit && <button onClick={()=>setIsEditingName(true)} style={{border:'none', background:'transparent', cursor:'pointer', marginLeft:'5px'}}>✏️</button>}</>
                    )}
                </div>
                <div style={{color:'#667781', marginTop:'5px'}}>Grup • {members.length} peserta</div>
            </div>

            {/* Pengaturan (Accordion Style) */}
            {canManage && (
                <div style={{padding:'15px', borderBottom:'10px solid #f0f2f5'}}>
                    <div style={{fontWeight:'bold', color:'#008069', marginBottom:'10px'}}>Pengaturan Grup</div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', fontSize:'14px'}}>
                        <span>Hanya Admin Kirim Pesan</span>
                        <input type="checkbox" checked={onlyAdminsMsg} onChange={e=>handleSettingChange('only_admins_message', e.target.checked)} />
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'14px'}}>
                        <span>Hanya Admin Edit Info</span>
                        <input type="checkbox" checked={onlyAdminsEdit} onChange={e=>handleSettingChange('only_admins_edit', e.target.checked)} />
                    </div>
                </div>
            )}

            {/* Daftar Anggota */}
            <div style={{padding:'15px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                    <span style={{color:'#667781'}}>{members.length} peserta</span>
                    {canManage && <button onClick={()=>setShowAddMember(!showAddMember)} style={{color:'#008069', background:'none', border:'none', cursor:'pointer'}}>Tambah Peserta</button>}
                </div>

                {showAddMember && (
                    <div style={{background:'#f0f2f5', padding:'10px', borderRadius:'5px', marginBottom:'10px'}}>
                        {contactsList.filter(c => !members.find(m=>m.id===c.id)).map(c => (
                            <div key={c.id} onClick={()=>handleAddMember(c.id)} style={{padding:'8px', borderBottom:'1px solid #ddd', cursor:'pointer'}}>{c.display_name}</div>
                        ))}
                    </div>
                )}

                {members.map(m => {
                    const isOwner = chat.created_by === m.id;
                    const isSub = m.role === 'admin' && !isOwner;
                    return (
                        <div key={m.id} style={{display:'flex', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f0f2f5'}}>
                            <img src={m.profile_pic_url || 'https://via.placeholder.com/40'} style={{width:'40px', height:'40px', borderRadius:'50%', marginRight:'10px'}} />
                            <div style={{flex:1}}>
                                <div style={{fontSize:'15px'}}>{getDisplayName(m)}</div>
                                {(isOwner || isSub) && <span style={{fontSize:'11px', background:'#e9edef', padding:'2px 5px', borderRadius:'3px', color:'#667781'}}>{isOwner ? 'Admin Grup' : 'Admin'}</span>}
                            </div>
                            {/* Dropdown Action (Simplified) */}
                            {amIOwner && m.id !== user.id && (
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <button onClick={()=>handleToggleSubAdmin(m.id, m.role)} style={{fontSize:'10px', cursor:'pointer', border:'1px solid #ccc'}}>Admin?</button>
                                    <button onClick={()=>handleRemoveMember(m.id, m.username)} style={{fontSize:'10px', color:'red', border:'none', background:'none', cursor:'pointer'}}>X</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{padding:'20px', color:'red', cursor:'pointer', display:'flex', alignItems:'center'}} onClick={()=>handleRemoveMember(user.id, "diri sendiri")}>
                <span style={{marginRight:'10px'}}>🚪</span> Keluar dari grup
            </div>
        </div>
    </div>
  );
}