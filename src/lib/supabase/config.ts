/**
 * Checks whether valid Supabase credentials have been configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) return false;
  if (url.includes('placeholder') || url.includes('your-project')) return false;
  if (anonKey.includes('placeholder') || anonKey.includes('your-anon-key')) return false;

  return url.startsWith('https://');
}

export function isSupabaseAdminConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey || serviceKey.includes('placeholder') || serviceKey.includes('your-service-role-key')) {
    return false;
  }
  return true;
}
