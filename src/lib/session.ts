import { cookies } from 'next/headers';

export interface UserSessionPayload {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'friend';
}

const SESSION_COOKIE_NAME = 'campusbite_session';

export function setSessionCookie(user: UserSessionPayload) {
  const cookieStore = cookies();
  const serialized = Buffer.from(JSON.stringify(user)).toString('base64');
  cookieStore.set(SESSION_COOKIE_NAME, serialized, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  });
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
