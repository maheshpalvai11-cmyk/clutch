import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  clearSessionCookie();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignored
    }
  }

  return NextResponse.json({ success: true });
}
