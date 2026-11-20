import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
    // Local safe mock client to avoid net::ERR_NAME_NOT_RESOLVED
    return createBrowserClient('http://localhost:3000', 'local-anon-key');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
