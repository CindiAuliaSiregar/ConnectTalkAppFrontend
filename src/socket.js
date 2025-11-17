// src/socket.js (VERSI BARU)
import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';

// Buat instance socket
const socket = io(URL, {
  autoConnect: false, // Kita akan konek manual
  // Ini bagian penting: kirim token untuk otentikasi
  auth: (cb) => {
    cb({
      token: localStorage.getItem('chat_token')
    });
  }
});

export default socket;