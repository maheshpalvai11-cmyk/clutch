import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { Profile } from '@/types/database';

export interface AuthSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
}

/**
 * Validates the current user session and fetches their active profile.
 * Throws an error or returns null if not authenticated or inactive.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  // Fetch profile via admin client to ensure full profile details and avoid circular RLS issues
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  };
}

/**
 * Validates that the current user has the Admin role.
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session || session.profile.role !== 'admin') {
    throw new Error('Unauthorized: Admin privilege required.');
  }
  return session;
}

/**
 * Validates that the current user is authenticated (friend or admin).
 */
export async function requireUser(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('Unauthorized: Authentication required.');
  }
  return session;
}
