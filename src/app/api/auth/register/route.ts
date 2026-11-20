import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { getLocalStore, saveLocalStore } from '@/lib/local-store';
import { attachSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const full_name = (body.full_name || body.fullName || '').toString();
    const email = (body.email || '').toString();
    const password = (body.password || '').toString();
    const requestedRole = body.role || 'friend';
    const admin_code = (body.admin_code || body.adminCode || '').toString();

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

    // Role resolution (default to friend, or admin if requested with valid code or local dev)
    let assignedRole: 'admin' | 'friend' = 'friend';
    if (requestedRole === 'admin') {
      if (admin_code && admin_code.trim() !== 'ADMIN2026' && admin_code.trim() !== 'campusbite') {
        return NextResponse.json(
          { error: 'Invalid Admin Security Code. (Use "ADMIN2026" or leave as Friend).' },
          { status: 400 }
        );
      }
      assignedRole = 'admin';
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // 1. REAL SUPABASE MODE
    if (isSupabaseAdminConfigured()) {
      const adminClient = createAdminClient();

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: assignedRole,
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
          role: assignedRole,
          full_name: cleanName,
          email: cleanEmail,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      const response = NextResponse.json({
        success: true,
        message: `${assignedRole === 'admin' ? 'Admin' : 'Friend'} account created successfully.`,
        role: assignedRole,
        user: {
          id: authData.user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: assignedRole,
        },
      });

      return attachSessionCookie(response, {
        id: authData.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: assignedRole,
      });
    }

    // 2. LOCAL DEV / DEMO STORE MODE
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

    const newId = `${assignedRole}-${Date.now()}`;
    const newProfile = {
      id: newId,
      role: assignedRole,
      full_name: cleanName,
      email: cleanEmail,
      password,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.profiles.push(newProfile);
    saveLocalStore(store);

    const response = NextResponse.json({
      success: true,
      message: `${assignedRole === 'admin' ? 'Admin' : 'Friend'} account created successfully.`,
      role: assignedRole,
      user: {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name,
        role: newProfile.role,
      },
    });

    return attachSessionCookie(response, {
      id: newProfile.id,
      email: newProfile.email,
      full_name: newProfile.full_name,
      role: newProfile.role,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error occurred.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
