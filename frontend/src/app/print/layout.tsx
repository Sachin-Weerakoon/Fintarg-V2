import { getSessionUser } from '@/actions/auth';
import { AppProvider } from '@/store';
import { redirect } from 'next/navigation';

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/welcome');
  return (
    <AppProvider initialProfile={{ ...(user.profile || {}), plan: (user.plan as any) || user.profile?.plan || 'basic' }}>
      <div className="min-h-screen bg-white text-text font-sans">
        {children}
      </div>
    </AppProvider>
  );
}
