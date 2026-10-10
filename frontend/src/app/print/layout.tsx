import { getSessionUser } from '@/actions/auth';
import { AppProvider } from '@/store';
import { redirect } from 'next/navigation';

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/welcome');
  return (
    <AppProvider initialProfile={user.profile || {}}>
      <div className="min-h-screen bg-white text-slate-900">
        {children}
      </div>
    </AppProvider>
  );
}
