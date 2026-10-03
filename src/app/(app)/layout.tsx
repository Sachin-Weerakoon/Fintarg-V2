import { getSessionUser } from '@/actions/auth';
import AppLayout from '@/components/AppLayout';
import { redirect } from 'next/navigation';

export default async function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/welcome');
  return <AppLayout user={user}>{children}</AppLayout>;
}
