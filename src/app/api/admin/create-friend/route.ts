import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { email, password, full_name } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    if (isSupabaseAdminConfigured()) {
      const adminClient = createAdminClient();

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: 'friend',
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Failed to create user in auth system.' },
          { status: 400 }
        );
      }

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: authData.user.id,
            role: 'friend',
            full_name: cleanName,
            email: cleanEmail,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (profileError) {
        return NextResponse.json(
          { error: `Auth created but profile insert failed: ${profileError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, profile });
    }

    // Local Store Fallback
    const store = getLocalStore();
    const existing = store.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const newProfile = {
      id: `friend-${Date.now()}`,
      role: 'friend' as const,
      full_name: cleanName,
      email: cleanEmail,
      password,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.profiles.push(newProfile);
    saveLocalStore(store);

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
