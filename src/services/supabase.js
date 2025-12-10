import { createClient } from '@supabase/supabase-js';

// Agora pegamos os valores das variáveis de ambiente
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;