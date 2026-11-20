import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Supabase configuration first
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database is not connected yet. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file (refer to .env.example).',
        },
        { status: 503 }
      );
    }

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

    const adminClient = createAdminClient();

    // 2. Create auth user with email_confirm: true so no SMTP verification gate blocks users
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

    // 3. Insert into profiles table with role: 'friend'
    const { error: profileError } = await adminClient
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
      );

    if (profileError) {
      return NextResponse.json(
        { error: `Account created in auth, but profile insert failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: authData.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: 'friend',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error occurred.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
