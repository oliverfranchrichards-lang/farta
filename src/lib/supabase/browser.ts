import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './env';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | undefined;

export function createClient() {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv();
    client = createBrowserClient<Database>(url, anonKey);
  }

  return client;
}
