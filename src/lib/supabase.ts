import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const defaultUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co';
const defaultKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'placeholder-anon-key';

export function createSupabaseClient(
  url: string = defaultUrl,
  anonKey: string = defaultKey
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();
