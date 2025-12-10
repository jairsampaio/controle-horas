import { createClient } from '@supabase/supabase-js';

// Suas credenciais (depois moveremos para variável de ambiente)
const SUPABASE_URL = 'https://ubwutmslwlefviiabysc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid3V0bXNsd2xlZnZpaWFieXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjQ4MTgsImV4cCI6MjA4MDgwMDgxOH0.lTlvqtu0hKtYDQXJB55BG9ueZ-MdtbCtBvSNQMII2b8';

// Cria a conexão
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;