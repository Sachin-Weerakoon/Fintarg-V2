import { redirect } from 'next/navigation';
import { getSessionUser } from '@/actions/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect('/');
  return (
    <div className="dark-mode min-h-screen bg-[#070D19] text-[#E8EEF7] antialiased selection:bg-primary-500/30 selection:text-white">
      {children}
    </div>
  );
}
