import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active=true,version=0;
    supabase.auth.getSession().then(({data})=>{if(active&&version===0)setUser(data?.session?.user??null);}).catch(()=>{if(active&&version===0)setUser(null);}).finally(()=>{if(active)setLoading(false);});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      version++;if(active){setUser(session?.user??null);setLoading(false);}
    });

    return () => {active=false;subscription.unsubscribe();};
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const {error}=await supabase.auth.signOut();if(error)throw error;
  }

  return { user, loading, signIn, signUp, signOut };
}
