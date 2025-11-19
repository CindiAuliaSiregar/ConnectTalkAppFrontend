// src/api.js
import axios from 'axios';

const API_URL = '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Ini penting! 'interceptor' ini akan otomatis
// menambahkan token ke SETIAP request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Fungsi Auth (tetap sama)
export const registerUser = (userData) => {
  return apiClient.post('/auth/register', userData);
};
export const loginUser = (credentials) => {
  return apiClient.post('/auth/login', credentials);
};

// --- FUNGSI BARU ---
export const getContacts = () => {
  return apiClient.get('/contacts');
};

export const addContact = (contactData) => {
  // contactData: { custom_id, display_name }
  return apiClient.post('/contacts', contactData);
};

//Fungsi Edt Kontak
export const updateContact = (contactTableId, newName) => {
  return apiClient.put(`/contacts/${contactTableId}`, { display_name: newName });
};

//Fungsi Hapus Kontak
export const deleteContact = (contactTableId) => {
  return apiClient.delete(`/contacts/${contactTableId}`);
};

export const findOrCreateChat = (contactUserId) => {
  return apiClient.post('/chats/private', { contactUserId });
};

export const getMessagesForChat = (chatId) => {
  return apiClient.get(`/chats/${chatId}/messages`);
};

export const deleteMessage = (messageId, mode) => {
  // mode = 'me' atau 'everyone'
  return apiClient.delete(`/messages/${messageId}`, { data: { mode } });
};

export const getChatDetails = (chatId) => {
  return apiClient.get(`/chats/${chatId}/details`);
};

export const updateProfile = (profileData) => {
  // profileData bisa berisi { bio } atau { profile_pic_url } atau keduanya
  return apiClient.put('/users/profile', profileData);
};

export const createGroup = (groupName, memberIds) => {
  return apiClient.post('/groups', { groupName, memberIds });
};

export const getMyGroups = () => {
  return apiClient.get('/groups');
};

export const updateGroupInfo = (chatId, data) => apiClient.put(`/groups/${chatId}/info`, data);
export const addGroupParticipants = (chatId, memberIds) => apiClient.post(`/groups/${chatId}/participants`, { memberIds });
export const removeGroupParticipant = (chatId, userId) => apiClient.delete(`/groups/${chatId}/participants/${userId}`);
export const getGroupMembers = (chatId) => apiClient.get(`/groups/${chatId}/members`);
export const updateAccount = (data) => apiClient.put('/users/account', data);
export const deleteAccount = () => apiClient.delete('/users/account');
export const clearChat = (chatId) => { };

export const updateGroupSettings = (chatId, settings) => {
  return apiClient.put(`/groups/${chatId}/settings`, settings);
};

export const toggleGroupAdmin = (chatId, userId, role) => {
  return apiClient.put(`/groups/${chatId}/participants/${userId}/role`, { role });
};