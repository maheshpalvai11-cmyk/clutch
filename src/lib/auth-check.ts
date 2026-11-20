import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSessionCookie } from '@/lib/session';
import { getLocalStore } from '@/lib/local-store';
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
 * Supports both real Supabase authentication and local stateful session store.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  // 1. If Supabase is configured, use Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile && profile.is_active) {
          return {
            user: {
              id: user.id,
              email: user.email,
            },
            profile,
          };
        }
      }
    } catch {
      // Fallback to cookie below
    }
  }

  // 2. Cookie session fallback (works out of the box in local dev/demo)
  const session = getSessionCookie();
  if (session && session.id) {
    const store = getLocalStore();
    const profile = store.profiles.find((p) => p.id === session.id);
    if (profile && profile.is_active) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
        },
        profile: {
          id: profile.id,
          role: profile.role,
          full_name: profile.full_name,
          email: profile.email,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      };
    }
  }

  return null;
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
