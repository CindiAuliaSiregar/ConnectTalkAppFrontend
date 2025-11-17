// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Ambil ini dari Dashboard Supabase Anda:
// Project Settings > API > Project URL
const supabaseUrl = 'https://ghwnmbjkrojwmcckncuh.supabase.co' 
// Project Settings > API > Project API Keys > anon (public)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod25tYmprcm9qd21jY2tuY3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDczMzgsImV4cCI6MjA3NzcyMzMzOH0.m_PhK68zMWOvBwjOBztUCW0SoeRIznRWzk-Yem5YK6w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)