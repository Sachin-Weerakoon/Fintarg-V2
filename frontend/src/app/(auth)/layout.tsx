import { redirect } from 'next/navigation';
import { getSessionUser } from '@/actions/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    // If backend is temporarily unreachable, allow user to access auth pages
    user = null;
  }
  if (user) redirect('/');
  return (
    <div className="dark-mode min-h-screen bg-[#070D19] text-[#E8EEF7] antialiased selection:bg-primary-500/30 selection:text-white">
      {children}
    </div>
  );
}
