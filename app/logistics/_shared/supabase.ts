'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
}

export function fmtDateYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
} 
