import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getLocalStore } from '@/lib/local-store';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. IF REAL SUPABASE IS CONFIGURED
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || 'Invalid email or password' },
          { status: 401 }
        );
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        return NextResponse.json(
          { error: 'User profile not found. Please contact administrator.' },
          { status: 403 }
        );
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: 'Your account is deactivated. Please contact administrator.' },
          { status: 403 }
        );
      }

      setSessionCookie({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      });

      return NextResponse.json({
        success: true,
        role: profile.role,
        user: profile,
      });
    }

    // 2. LOCAL DEV / DEMO STORE MODE (When Supabase keys are not set yet)
    const store = getLocalStore();
    const user = store.profiles.find(
      (p) => p.email.toLowerCase() === cleanEmail
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password. You can click "Create Account" to register as a new friend.' },
        { status: 401 }
      );
    }

    if (user.password && user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid password. Please check your credentials.' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Please contact the administrator.' },
        { status: 403 }
      );
    }

    setSessionCookie({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
