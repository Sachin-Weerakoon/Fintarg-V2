'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthView } from '@/components/auth/AuthView';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');
  const initialMode = tab === 'signup' ? 'signup' : 'signin';
  return <AuthView initialMode={initialMode} key={initialMode} />;
}

export default function Welcome() {
  return (
    <Suspense fallback={<AuthView initialMode="signin" />}>
      <WelcomeContent />
    </Suspense>
  );
}
