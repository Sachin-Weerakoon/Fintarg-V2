import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="onboarding-card max-w-md text-center">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Page not found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>The page you are looking for does not exist.</p>
        <Link href="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );
}
