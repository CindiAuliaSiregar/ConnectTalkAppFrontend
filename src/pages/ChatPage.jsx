import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import socket from '../socket';
import '../Chat.css';
import AddContactModal from '../Components/AddContactModal';
import ProfileModal from '../Components/ProfileModal';
import ContactInfoModal from '../Components/ContactInfoModal';
import CreateGroupModal from '../Components/CreateGroupModal';
import GroupInfoModal from '../Components/GroupInfoModal';
import EmojiPicker from 'emoji-picker-react';
import SimplePeer from 'simple-peer'; 
import { 
  getContacts, findOrCreateChat, getMessagesForChat, deleteMessage, getChatDetails, getMyGroups 
} from '../api';

// --- HELPERS ---
const formatDateSeparator = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "HARI INI";
  if (date.toDateString() === yesterday.toDateString()) return "KEMARIN";
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getNameColor = (name) => {
  const colors = ['#e542a3', '#1f7aec', '#008069', '#a83232', '#d68f00', '#6c48d3'];
  let hash = 0;
  for (let i = 0; i < (name ? name.length : 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const MessageStatus = ({ isMe, isRead, isDelivered }) => {
  if (!isMe) return null;
  let color = '#999', icon = '✓';
  if (isRead) { color = '#53bdeb'; icon = '✓✓'; }
  else if (isDelivered) { color = '#999'; icon = '✓✓'; }
  return <span style={{marginLeft:'5px', fontSize:'11px', color:color, fontWeight:'bold'}}>{icon}</span>
};

export default function ChatPage() {
  const { user, logout } = useAuth();
  
  // STATE DATA
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [incomingChats, setIncomingChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  
  // STATE UI
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // STATE FITUR
  const [replyingTo, setReplyingTo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUser, setTypingUser] = useState(null);

  // STATE CALL (Video/Voice)
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [nameCaller, setNameCaller] = useState("");
  const [isVideoCall, setIsVideoCall] = useState(true); // State tipe panggilan

  // STATE KUSTOMISASI
  const [myBubbleColor, setMyBubbleColor] = useState(localStorage.getItem('bubbleColor') || '#dcf8c6'); 
  const [chatBg, setChatBg] = useState(localStorage.getItem('chatBg') || 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
  
  // REFS
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const contactsRef = useRef(contacts);
  const incomingChatsRef = useRef(incomingChats);
  const activeChatRef = useRef(activeChat);
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { incomingChatsRef.current = incomingChats; }, [incomingChats]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      const resContacts = await getContacts();
      setContacts(resContacts.data.map(c => ({ ...c, id: c.user_id, contact_table_id: c.id, type: 'contact', profile_pic_url: c.profile_pic_url, bio: c.bio || '' })));
      const resGroups = await getMyGroups();
      setGroups(resGroups.data.map(g => ({ 
        id: g.id, chat_id: g.id, display_name: g.chat_name, is_group: true, type: 'group',
        group_icon_url: g.group_icon_url, created_by: g.created_by, role: g.role,
        only_admins_message: g.only_admins_message, only_admins_edit: g.only_admins_edit
      })));
    } catch (err) { console.error(err); }
  };

  // --- SOCKET & LOGIC UTAMA ---
  useEffect(() => {
    if (!user) return;
    socket.connect();
    fetchData();

    // Listener Call (Menangani Video vs Voice)
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setNameCaller(data.name);
      setCallerSignal(data.signal);
      setIsVideoCall(data.isVideoCall); // <-- Simpan tipe panggilan dari penelpon
    });
    socket.on("callEnded", () => leaveCall());

    const handleNewMessage = (newMessage) => {
      const { chat_id, sender_id } = newMessage;
      setMessages((prev) => ({ ...prev, [chat_id]: [...(prev[chat_id] || []), newMessage] }));
      
      if (sender_id !== user.id) {
        socket.emit('markAsDelivered', { messageId: newMessage.id, chatId: chat_id });
        if (activeChatRef.current && activeChatRef.current.chat_id === chat_id) { 
            socket.emit('markAsRead', { chatId: chat_id }); 
        }
      }
      setTypingUser(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      const known = contactsRef.current.some(c => c.chat_id === chat_id) || groups.some(g => g.id === chat_id) || incomingChatsRef.current.some(c => c.chat_id === chat_id);
      if (known || sender_id === user.id) return;
      getChatDetails(chat_id).then(res => {
         const otherUser = res.data.user;
         setIncomingChats(prev => [{ chat_id, id: otherUser.id, display_name: otherUser.username, custom_id: otherUser.custom_id, profile_pic_url: otherUser.profile_pic_url, type: 'incoming', bio: otherUser.bio }, ...prev]);
      });
    };

    socket.on('messageDeleted', ({ messageId, chatId }) => {
       setMessages(prev => {
          if (!prev[chatId]) return prev;
          return {
             ...prev,
             [chatId]: prev[chatId].map(m => m.id === messageId ? { ...m, is_deleted: true, content: '🚫 Pesan ini telah dihapus' } : m)
          };
       });
    });
    
    socket.on('newMessage', handleNewMessage);
    socket.on('userTyping', (data) => { 
        if (activeChatRef.current?.chat_id === data.chatId) { 
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); 
            const info = getBubbleInfo(data.senderId, data.username); 
            setTypingUser(info.name); 
            typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000); 
        } 
    });
    socket.on('messagesRead', ({ chatId }) => setMessages(prev => ({...prev, [chatId]: (prev[chatId]||[]).map(m => ({...m, is_read:true, is_delivered:true}))})));
    socket.on('messageStatusUpdate', ({ messageId, status }) => { if(status==='delivered') setMessages(prev => { const n={...prev}; for(let cid in n) n[cid]=n[cid].map(m=>m.id===messageId?{...m, is_delivered:true}:m); return n; }); });
    socket.on('onlineUsersList', (ids) => setOnlineUsers(new Set(ids)));
    socket.on('userOnline', ({ userId }) => setOnlineUsers(prev => new Set(prev).add(userId)));
    socket.on('userOffline', ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));
    socket.on('addedToGroup', fetchData); socket.on('removedFromGroup', fetchData); socket.on('refreshGroupData', fetchData);

    return () => {
      socket.off('newMessage'); socket.off('messageDeleted'); socket.off('userTyping'); 
      socket.off('messagesRead'); socket.off('messageStatusUpdate');
      socket.off('onlineUsersList'); socket.off('userOnline'); socket.off('userOffline');
      socket.off('addedToGroup'); socket.off('removedFromGroup'); socket.off('refreshGroupData');
      socket.off("callUser"); socket.off("callEnded");
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => { if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight; }, [messages, activeChat, replyingTo]);

  // --- LOGIKA CALL (FIXED VIDEO vs VOICE) ---
  const handleCall = (isVid) => {
     if (!activeChat || activeChat.is_group) return alert("Panggilan grup belum tersedia");
     setIsVideoCall(isVid);
     
     // Jika Voice Call, video: false
     navigator.mediaDevices.getUserMedia({ video: isVid, audio: true }).then((stream) => {
        setStream(stream);
        setCallEnded(false);
        if(myVideo.current) myVideo.current.srcObject = stream;
        
        const peer = new SimplePeer({ initiator: true, trickle: false, stream: stream });
        
        peer.on("signal", (data) => {
           socket.emit("callUser", { 
             userToCall: activeChat.id, 
             signalData: data, 
             from: user.id, 
             name: user.username, 
             isVideoCall: isVid // Kirim tipe call
           });
        });
        
        peer.on("stream", (stream) => { if(userVideo.current) userVideo.current.srcObject = stream; });
        socket.on("callAccepted", (signal) => { setCallAccepted(true); peer.signal(signal); });
        connectionRef.current = peer;
        
        // --- CATAT RIWAYAT ---
        const callText = isVid ? "📹 Panggilan Video" : "📞 Panggilan Suara";
        socket.emit('sendMessage', { chatId: activeChat.chat_id, content: callText, type: 'call_history' });
        
     }).catch(e => alert("Gagal akses media: " + e));
  };

  const answerCall = () => {
    setCallAccepted(true);
    // Jawab sesuai tipe panggilan yang diterima
    navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true }).then((stream) => {
      setStream(stream);
      if(myVideo.current) myVideo.current.srcObject = stream;
      
      const peer = new SimplePeer({ initiator: false, trickle: false, stream: stream });
      peer.on("signal", (data) => socket.emit("answerCall", { signal: data, to: caller }));
      peer.on("stream", (stream) => { if(userVideo.current) userVideo.current.srcObject = stream; });
      peer.signal(callerSignal);
      connectionRef.current = peer;
    }).catch(e => alert("Gagal akses media"));
  };

  const leaveCall = () => {
    setCallEnded(true); setReceivingCall(false); setCallAccepted(false);
    if(connectionRef.current) connectionRef.current.destroy();
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    if(activeChat && !receivingCall) socket.emit("endCall", { to: activeChat.id });
    if(caller) socket.emit("endCall", { to: caller });
    window.location.reload();
  };
  // -------------------

  const handleSelectChat=async(i)=>{setReplyingTo(null);if(i.type==='contact'&&!i.chat_id){try{const r=await findOrCreateChat(i.user_id);const c=r.data.chat_id;setContacts(p=>p.map(x=>x.id===i.id?{...x,chat_id:c}:x));setActiveChat({...i,chat_id:c});loadMessages(c);}catch(e){}}else{setActiveChat(i);loadMessages(i.chat_id);}};
  const loadMessages=async(c)=>{socket.emit('joinRoom',c);try{const r=await getMessagesForChat(c);setMessages(p=>({...p,[c]:r.data}));socket.emit('markAsRead',{chatId:c});}catch(e){}};
  const handleSubmitMessage=(e)=>{if(e)e.preventDefault();if(!messageInput.trim()||!activeChat)return;setTypingUser(null);socket.emit('sendMessage',{chatId:activeChat.chat_id,content:messageInput.trim(),replyToId:replyingTo?replyingTo.id:null});setMessageInput('');setReplyingTo(null);};
  const handleKeyDown=(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSubmitMessage();}};
  const handleFileUpload=async(e)=>{const f=e.target.files[0];if(!f||!activeChat)return;let t='file';if(f.type.startsWith('image/'))t='image';else if(f.type.startsWith('video/'))t='video';try{const n=`${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;const {error}=await supabase.storage.from('chat-images').upload(`${activeChat.chat_id}/${n}`,f);if(error)throw error;const {data}=supabase.storage.from('chat-images').getPublicUrl(`${activeChat.chat_id}/${n}`);socket.emit('sendMessage',{chatId:activeChat.chat_id,content:data.publicUrl,type:t,replyToId:replyingTo?replyingTo.id:null});setReplyingTo(null);}catch(e){alert("Gagal upload");}};
  
  // --- FUNGSI HAPUS PESAN (OPTIMISTIC UPDATE / INSTAN) ---
  const handleDeleteMessage = async (msg) => {
    const isMe = msg.sender_id === user.id;
    const isAdmin = activeChat.is_group && activeChat.role === 'admin';
    let mode = null;
    
    if (isMe || isAdmin) {
       const choice = prompt("Ketik '1' Hapus Untuk Saya\nKetik '2' Hapus Untuk Semua");
       if (choice === '1') mode = 'me'; else if (choice === '2') mode = 'everyone'; else return;
    } else {
       if(!confirm("Hapus pesan ini untuk saya?")) return;
       mode = 'me';
    }

    try {
      // 1. Panggil API
      await deleteMessage(msg.id, mode);
      
      // 2. UPDATE TAMPILAN SECARA INSTAN (Optimistic)
      setMessages(prev => {
        const chatId = activeChat.chat_id;
        const currentList = prev[chatId] || [];
        if (mode === 'everyone') {
            return {
                ...prev,
                [chatId]: currentList.map(m => m.id === msg.id ? { ...m, is_deleted: true, content: '🚫 Pesan ini telah dihapus', deleted_by: user.id, deleter_name: user.username } : m)
            };
        } else {
            return { ...prev, [chatId]: currentList.filter(m => m.id !== msg.id) };
        }
      });

      // 3. Kirim Socket jika hapus semua
      if (mode === 'everyone') {
         socket.emit('messageDeletedEveryone', { chatId: activeChat.chat_id, messageId: msg.id });
      }
    } catch (err) { alert("Gagal menghapus"); console.error(err); }
  };
  
  const onEmojiClick = (emoji) => setMessageInput(p => p + emoji.emoji);

  const getBubbleInfo = (senderId, defaultUsername) => {
      if (senderId === user.id) return { name: user.username, pic: user.profile_pic_url };
      const saved = contacts.find(c => c.user_id === senderId);
      if (saved) return { name: saved.display_name, pic: saved.profile_pic_url, bio: saved.bio, custom_id: saved.custom_id }; 
      const incoming = incomingChats.find(c => c.id === senderId);
      if (incoming) return { name: incoming.display_name, pic: incoming.profile_pic_url, bio: incoming.bio, custom_id: incoming.custom_id };
      return { name: defaultUsername || "User", pic: null };
  };

  const handleHeaderClick = () => {
    if (activeChat.is_group) setShowGroupInfo(true);
    else setShowContactInfo(true); 
  };

  const changeMyColor = () => {
     const c = prompt("Masukkan kode warna (cth: red, #ffcc00):", myBubbleColor);
     if(c) { setMyBubbleColor(c); localStorage.setItem('bubbleColor', c); }
  };

  const handleBgUpload = (e) => {
     const file = e.target.files[0];
     if(file) {
        const url = URL.createObjectURL(file);
        setChatBg(url);
        localStorage.setItem('chatBg', url);
        setShowMenu(false);
     }
  };

  const renderReplyPreview = () => {
    if (!replyingTo) return null;
    const info = getBubbleInfo(replyingTo.sender_id, replyingTo.username || 'Seseorang');
    return (
      <div style={{background:'#f0f2f5', padding:'5px 10px', borderLeft:'5px solid #008069', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
         <div style={{fontSize:'12px', color:'#555', flex:1}}>
            <div style={{color:'#008069', fontWeight:'bold'}}>Membalas {info.name}</div>
            <div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'300px'}}>{replyingTo.type==='image'?'📷 Foto':replyingTo.content}</div>
         </div>
         <button onClick={()=>setReplyingTo(null)} style={{border:'none',background:'transparent',fontSize:'16px',cursor:'pointer',marginLeft:'10px'}}>✖</button>
      </div>
    )
  };

  if (!user) return <div>Loading...</div>;
  const currentMessages = activeChat ? messages[activeChat.chat_id] || [] : [];
  const isInputDisabled = activeChat?.is_group && activeChat.only_admins_message && activeChat.role !== 'admin';
  let lastDate = null;

  return (
    <>
      {((stream || receivingCall || callAccepted) && !callEnded) && (
        <div className="call-container">
           {receivingCall && !callAccepted ? (
             <div className="incoming-call-card">
                <h3>{nameCaller} memanggil ({isVideoCall ? 'Video' : 'Suara'})...</h3>
                <div style={{display:'flex', gap:'10px', justifyContent:'center', marginTop:'10px'}}>
                   <button className="call-btn btn-answer" onClick={answerCall}>📞</button>
                   <button className="call-btn btn-end" onClick={leaveCall}>❌</button>
                </div>
             </div>
           ) : (
             <div className="video-grid">
                {callAccepted && !callEnded && (
                   isVideoCall ? <video playsInline ref={userVideo} autoPlay className="user-video" /> : <div className="audio-call-view"><img src="https://via.placeholder.com/150" className="audio-avatar-large" alt="User" /><h3>Terhubung (Suara)</h3></div>
                )}
                {stream && isVideoCall && <video playsInline muted ref={myVideo} autoPlay className="my-video" />}
                <div style={{position:'absolute', bottom:'20px', display:'flex', gap:'20px'}}>
                    <button className="call-btn btn-end" onClick={leaveCall}>❌ Akhiri</button>
                </div>
             </div>
           )}
        </div>
      )}

      {showModal && <AddContactModal setShowModal={setShowModal} onContactAdded={fetchData} />}
      {showProfileModal && <ProfileModal setShowModal={setShowProfileModal} />}
      {showGroupModal && <CreateGroupModal setShowModal={setShowGroupModal} onGroupCreated={fetchData} />}
      
      {(showGroupInfo && activeChat?.is_group) && (
        <GroupInfoModal chat={activeChat} setShowModal={setShowGroupInfo} onUpdate={fetchData} allContacts={contacts} />
      )}
      
      {(showContactInfo && !activeChat?.is_group && activeChat) && (
        <ContactInfoModal 
           contact={{...activeChat, ...getBubbleInfo(activeChat.id, activeChat.display_name)}} 
           onClose={()=>setShowContactInfo(false)} 
           onUpdate={fetchData} 
           onDeleteChat={() => setMessages(p => ({...p, [activeChat.chat_id]: []}))}
        />
      )}

      <div className="app-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <img src={user.profile_pic_url || 'https://via.placeholder.com/40'} className="user-avatar" onClick={() => setShowProfileModal(true)} alt="Profil" />
            <div className="header-icons" style={{position:'relative'}}>
               <button onClick={() => setShowMenu(!showMenu)} style={{border:'none',background:'transparent',cursor:'pointer',fontSize:'1.5em',color:'#54656f'}}>⋮</button>
               {showMenu && (
                 <div className="menu-dropdown" style={{top:'40px', right:'0'}}>
                    <label className="menu-item"><span>🖼️ Ubah Wallpaper</span><input type="file" accept="image/*" hidden onChange={handleBgUpload} /></label>
                    <div className="menu-item" onClick={()=>{changeMyColor(); setShowMenu(false)}}><span>🎨 Ubah Warna Bubble</span></div>
                    <div className="menu-item" onClick={logout} style={{borderTop:'1px solid #eee', color:'red'}}><span>🚪 Logout</span></div>
                 </div>
               )}
            </div>
          </div>
          <div className="search-bar"><div className="search-input-wrapper"><input type="text" placeholder="Cari" disabled /></div></div>
          
          <div className="contact-list">
             <div style={{padding:'10px 16px', fontWeight:'bold', color:'#008069', display:'flex', justifyContent:'space-between'}}>GRUP <button onClick={()=>setShowGroupModal(true)} style={{border:'none',background:'transparent',cursor:'pointer',color:'#008069',fontSize:'1.2em'}}>+</button></div>
             {groups.map(item => (
                <div key={item.id} onClick={()=>handleSelectChat(item)} className={`contact-item ${activeChat?.id===item.id?'active':''}`}>
                   <img src={item.group_icon_url || "https://via.placeholder.com/40?text=G"} className="contact-avatar" alt="Grup"/>
                   <div className="contact-info"><div className="contact-name">{item.display_name}</div></div>
                </div>
             ))}
             <div style={{padding:'10px 16px', fontWeight:'bold', color:'#008069', display:'flex', justifyContent:'space-between', marginTop:'10px'}}>KONTAK <button onClick={()=>setShowModal(true)} style={{border:'none',background:'transparent',cursor:'pointer',color:'#008069',fontSize:'1.2em'}}>+</button></div>
             {contacts.map(item => (
               <div key={item.contact_table_id} onClick={()=>handleSelectChat(item)} className={`contact-item ${activeChat?.id===item.id?'active':''}`}>
                 <div style={{position:'relative'}}><img src={item.profile_pic_url||'https://via.placeholder.com/40'} className="contact-avatar" alt="Kontak"/>{onlineUsers.has(item.id)&&<span className="online-dot" style={{position:'absolute',bottom:0,right:'10px',border:'2px solid #fff'}}></span>}</div>
                 <div className="contact-info"><div className="contact-name">{item.display_name}</div></div>
               </div>
             ))}
             {incomingChats.map(item => ( <div key={item.id} onClick={()=>handleSelectChat(item)} className={`contact-item ${activeChat?.id===item.id?'active':''}`}><div className="contact-info"><div className="contact-name">{item.display_name}</div><div className="contact-status">Pesan Baru</div></div></div> ))}
          </div>
        </div>

        <div className="chat-area" style={{backgroundImage: `url(${chatBg})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
          {!activeChat ? <div className="empty-chat-placeholder">Pilih chat</div> : (
            <>
              <div className="chat-header" style={{cursor:'pointer'}} onClick={handleHeaderClick}>
                 <img src={activeChat.is_group ? (activeChat.group_icon_url||"https://via.placeholder.com/40?text=G") : (getBubbleInfo(activeChat.id, activeChat.display_name).pic||'https://via.placeholder.com/40')} className="header-avatar" />
                 <div className="header-info">
                    <div className="header-name">{activeChat.display_name}</div>
                    <div className="header-status">{activeChat.is_group ? 'Klik info grup' : (onlineUsers.has(activeChat.id)?'Online':'')}</div>
                 </div>
                 <div style={{marginLeft:'auto', display:'flex', gap:'15px', color:'#54656f'}}>
                    <button onClick={(e)=>{e.stopPropagation(); handleCall(true)}} style={{background:'none', border:'none', cursor:'pointer', fontSize:'18px'}}>📹</button>
                    <button onClick={(e)=>{e.stopPropagation(); handleCall(false)}} style={{background:'none', border:'none', cursor:'pointer', fontSize:'18px'}}>📞</button>
                 </div>
              </div>
              
              <div className="message-container" ref={messageListRef}>
                {currentMessages.map((msg, index) => {
                  const bubbleInfo = getBubbleInfo(msg.sender_id, msg.username);
                  const isMe = msg.sender_id === user.id;
                  const msgDate = new Date(msg.created_at).toDateString();
                  let showDate = false;
                  if (msgDate !== lastDate) { showDate = true; lastDate = msgDate; }

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDate && <div style={{display:'flex', justifyContent:'center', margin:'10px 0'}}><span style={{background:'#e1f3fb', color:'#1c1e21', padding:'5px 12px', borderRadius:'8px', fontSize:'12px', boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>{formatDateSeparator(msg.created_at)}</span></div>}
                      <div className={`message-row ${isMe ? 'row-me' : 'row-other'}`}>
                        <div className={`message-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`} style={isMe ? {backgroundColor: myBubbleColor} : {}} onDoubleClick={() => setReplyingTo(msg)}>
                           {msg.reply_to_id && (<div style={{background:'rgba(0,0,0,0.05)', padding:'5px', borderRadius:'5px', borderLeft:'4px solid #008069', marginBottom:'5px', fontSize:'12px', cursor:'pointer'}}><div style={{color:'#008069', fontWeight:'bold'}}>{msg.reply_username || "Seseorang"}</div><div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{msg.reply_content}</div></div>)}
                           {(!isMe && activeChat.is_group) && <div className="bubble-name" style={{color: getNameColor(bubbleInfo.name)}}>{bubbleInfo.name}</div>}
                           
                           {/* KONTEN PESAN (TERMASUK CALL HISTORY) */}
                           {msg.is_deleted ? <i style={{color:'#888'}}>🚫 Pesan dihapus {msg.deleter_name && `oleh ${msg.deleter_name}`}</i> 
                           : msg.type === 'call_history' ? <div className="bubble-system-call" style={{background:'#e1f3fb', padding:'8px 15px', borderRadius:'8px', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px', border:'1px solid #b3e5fc'}}>{msg.content.includes('Video')?'📹':'📞'} {msg.content}</div>
                           : msg.type === 'image' ? <img src={msg.content} style={{maxWidth:'100%', borderRadius:'8px', cursor:'pointer'}} onClick={()=>window.open(msg.content)} /> 
                           : msg.type === 'video' ? <video src={msg.content} controls style={{maxWidth:'100%', borderRadius:'8px'}} /> 
                           : msg.type === 'file' ? <a href={msg.content} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333'}}>📄 {msg.content.split('/').pop().substr(14)}</a> 
                           : <div style={{whiteSpace: 'pre-wrap'}} className="bubble-text">{msg.content}</div>}

                           <div className="bubble-meta">
                              <span className="bubble-time">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              <MessageStatus isMe={isMe} isRead={msg.is_read} isDelivered={msg.is_delivered} />
                              {!msg.is_deleted && msg.type !== 'call_history' && <span onClick={() => handleDeleteMessage(msg)} className="delete-icon" title="Hapus">🗑️</span>}
                           </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {isInputDisabled ? <div style={{padding:'15px', textAlign:'center', background:'#f0f2f5'}}>Hanya admin...</div> : (
                <div className="chat-input-area" style={{flexDirection:'column', alignItems:'stretch', padding:'0'}}>
                    {renderReplyPreview()}
                    <div style={{display:'flex', alignItems:'center', padding:'5px 16px', width:'100%', boxSizing:'border-box'}}>
                        {showEmojiPicker && <div className="emoji-picker-wrapper"><EmojiPicker onEmojiClick={onEmojiClick} /></div>}
                        <button className="icon-btn" onClick={()=>setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                        <label className="icon-btn">📎<input type="file" style={{display:'none'}} onChange={handleFileUpload} /></label>
                        <form className="input-form" onSubmit={handleSubmitMessage} style={{display:'flex', alignItems:'center', width:'100%'}}>
                          <textarea placeholder="Ketik pesan" value={messageInput} onChange={(e)=>{setMessageInput(e.target.value); if(activeChat) socket.emit('typing', {chatId: activeChat.chat_id})}} onFocus={()=>setShowEmojiPicker(false)} onKeyDown={handleKeyDown} rows={1} style={{width:'100%'}} />
                          <button type="submit" className="send-btn">➤</button>
                        </form>
                    </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}