'use client';
import Link from 'next/link';

export default function DashboardClient() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Good morning</div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Here is what needs your attention today.</p>
      </div>
      <div className="card text-center py-12">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Start by adding your income and expenses in the Financial tab.</p>
        <Link href="/financial" className="btn-primary mt-4">Go to Financial</Link>
      </div>
    </div>
  );
}
