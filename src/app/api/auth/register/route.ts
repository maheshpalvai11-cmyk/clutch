import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { full_name, email, password } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // 1. SUPABASE MODE (When credentials are fully provided)
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
        if (authError?.message?.includes('already registered')) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in instead.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: authError?.message || 'Failed to create account in database.' },
          { status: 400 }
        );
      }

      await adminClient.from('profiles').upsert(
        {
          id: authData.user.id,
          role: 'friend',
          full_name: cleanName,
          email: cleanEmail,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      setSessionCookie({
        id: authData.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: 'friend',
      });

      return NextResponse.json({
        success: true,
        message: 'Account created successfully.',
        role: 'friend',
        user: {
          id: authData.user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: 'friend',
        },
      });
    }

    // 2. LOCAL DEV / DEMO MODE (Seamless fallback when Supabase is not configured yet)
    const store = getLocalStore();
    const existing = store.profiles.find(
      (p) => p.email.toLowerCase() === cleanEmail
    );

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    const newId = `friend-${Date.now()}`;
    const newProfile = {
      id: newId,
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

    setSessionCookie({
      id: newProfile.id,
      email: newProfile.email,
      full_name: newProfile.full_name,
      role: newProfile.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      role: 'friend',
      user: {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name,
        role: newProfile.role,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error occurred.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
