import { useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const cleanSupabaseUrl = (url: string): string => {
  return url
    .trim()
    .replace(/\/realtime\/v1\/?$/, '')
    .replace(/\/rest\/v1\/?$/, '')
    .trim();
};

export function createEnvironmentSupabaseClient(): SupabaseClient | null {
  const url = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;

  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Supabase initialization failed:', err);
    return null;
  }
}

export function useSupabaseClient(realtimeToken = '') {
  const supabase = useMemo(() => createEnvironmentSupabaseClient(), []);

  useEffect(() => {
    if (supabase && realtimeToken) void supabase.realtime.setAuth(realtimeToken);
  }, [supabase, realtimeToken]);

  return { supabase };
}
