import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';

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

    const adminClient = createAdminClient();

    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: 'friend',
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user in auth system.' },
        { status: 400 }
      );
    }

    // 2. Insert into profiles table
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          role: 'friend',
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
