import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const unavailableError = () => new Error(
  'Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar autenticación y cartera.'
);

const unavailableClient = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: unavailableError() }),
    signUp: async () => ({ error: unavailableError() }),
    signOut: async () => ({ error: unavailableError() }),
  },
};

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : unavailableClient;
