import { redirect } from 'next/navigation';
import { getSessionUser } from '@/actions/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect('/');
  return <>{children}</>;
}
