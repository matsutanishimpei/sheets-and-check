import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../lib/storage';

const cleanSupabaseUrl = (url: string): string => {
  return url
    .trim()
    .replace(/\/realtime\/v1\/?$/, '')
    .replace(/\/rest\/v1\/?$/, '')
    .trim();
};

export function useSupabaseClient(initialUrl: string, initialKey: string, realtimeToken = '') {
  const [supabaseUrl, setSupabaseUrl] = useState(initialUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialKey);
  
  const [supabase, setSupabase] = useState<SupabaseClient | null>(() => {
    const url = cleanSupabaseUrl(supabaseConfig.getUrl() || initialUrl);
    const key = supabaseConfig.getKey() || initialKey;
    if (url && key) {
      try {
        const client = createClient(url, key.trim());
        if (realtimeToken) void client.realtime.setAuth(realtimeToken);
        return client;
      } catch (err) {
        console.error('Supabase initialization failed:', err);
      }
    }
    return null;
  });

  // Sync props changes to internal state
  useEffect(() => {
    if (initialUrl && initialUrl !== supabaseUrl) {
      setSupabaseUrl(initialUrl);
    }
    if (initialKey && initialKey !== supabaseAnonKey) {
      setSupabaseAnonKey(initialKey);
    }
  }, [initialUrl, initialKey]);

  // Dynamically re-initialize Supabase client when credentials update
  useEffect(() => {
    const cleanedUrl = cleanSupabaseUrl(supabaseUrl);
    const trimmedKey = supabaseAnonKey.trim();

    if (cleanedUrl && trimmedKey) {
      try {
        const client = createClient(cleanedUrl, trimmedKey);
        if (realtimeToken) void client.realtime.setAuth(realtimeToken);
        setSupabase(client);
        
        try {
          supabaseConfig.save(cleanedUrl, trimmedKey);
        } catch (storageErr) {
          console.warn('Failed to save Supabase config to localStorage (Private Window?):', storageErr);
        }
      } catch (err) {
        console.error('Dynamic Supabase re-initialization failed:', err);
        setSupabase(null);
      }
    } else {
      setSupabase(null);
    }
  }, [supabaseUrl, supabaseAnonKey, realtimeToken]);

  const saveSupabaseConfig = useCallback((onSuccess: (msg: string) => void, onError: (msg: string) => void) => {
    const cleanedUrl = cleanSupabaseUrl(supabaseUrl);
    const trimmedKey = supabaseAnonKey.trim();
    
    if (!cleanedUrl || !trimmedKey) {
      onError('Supabase URL と Anon Key を両方とも入力してください');
      return;
    }
    try {
      const parsedUrl = new URL(cleanedUrl);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
        throw new Error('Supabase URL は認証情報を含まない HTTPS URL を指定してください');
      }
      const client = createClient(cleanedUrl, trimmedKey);
      if (realtimeToken) void client.realtime.setAuth(realtimeToken);
      setSupabase(client);
      
      try {
        supabaseConfig.save(cleanedUrl, trimmedKey);
      } catch (storageErr) {
        console.warn('Failed to save to localStorage:', storageErr);
      }
      
      onSuccess('接続設定をローカルに保持しました！');
    } catch (err: any) {
      onError(`接続設定エラー: ${err.message}`);
    }
  }, [supabaseUrl, supabaseAnonKey, realtimeToken]);

  return {
    supabase,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    saveSupabaseConfig
  };
}
