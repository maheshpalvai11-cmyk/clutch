import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface UserSessionPayload {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'friend';
}

export const SESSION_COOKIE_NAME = 'campusbite_session';

export function attachSessionCookie(response: NextResponse, user: UserSessionPayload): NextResponse {
  const serialized = Buffer.from(JSON.stringify(user)).toString('base64');
  response.cookies.set(SESSION_COOKIE_NAME, serialized, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function setSessionCookie(user: UserSessionPayload) {
  try {
    const cookieStore = cookies();
    const serialized = Buffer.from(JSON.stringify(user)).toString('base64');
    cookieStore.set(SESSION_COOKIE_NAME, serialized, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Handled via attachSessionCookie on NextResponse
  }
}

export function clearSessionCookie() {
  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
    });
  } catch {
    // Handled
  }
}

export function getSessionCookie(): UserSessionPayload | null {
  try {
    const cookieStore = cookies();
    const val = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!val) return null;
    const jsonStr = Buffer.from(val, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
