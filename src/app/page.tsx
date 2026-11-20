import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth-check';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getAuthSession();

  if (!session || !session.profile.is_active) {
    redirect('/login');
  }

  if (session.profile.role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/friend');
  }
}
