import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const SESSION_COOKIE_NAME = 'campusbite_session';

interface SessionPayload {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'friend';
}

function parseSessionCookie(request: NextRequest): SessionPayload | null {
  try {
    const val = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!val) return null;
    const jsonStr = Buffer.from(val, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  let currentUser: { id: string; email?: string; role?: string } | null = null;

  // 1. Check real Supabase user if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        currentUser = { id: user.id, email: user.email };
      }
    } catch {
      // Fallback to cookie below
    }
  }

  // 2. Check local cookie session (works in both Supabase mode and Local mode)
  const sessionCookie = parseSessionCookie(request);
  if (sessionCookie && sessionCookie.id) {
    currentUser = {
      id: sessionCookie.id,
      email: sessionCookie.email,
      role: sessionCookie.role,
    };
  }

  // Route: /login
  if (pathname === '/login') {
    if (currentUser) {
      const destination = currentUser.role === 'admin' ? '/admin' : '/friend';
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return response;
  }

  // Route: /admin/*
  if (pathname.startsWith('/admin')) {
    if (!currentUser) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (currentUser.role && currentUser.role !== 'admin') {
      return NextResponse.redirect(new URL('/friend', request.url));
    }
    return response;
  }

  // Route: /friend/*
  if (pathname.startsWith('/friend')) {
    if (!currentUser) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/friend/:path*', '/login'],
};
