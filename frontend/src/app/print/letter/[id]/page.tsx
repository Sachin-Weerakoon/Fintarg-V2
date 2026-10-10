'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/store';
import { Button } from '@/components/ui/Button';

export default function PrintLetterPage() {
  const params = useParams();
  const { state } = useApp();
  const id = params?.id as string;

  const letter = state.letters?.find(l => l.id === id) || state.letters?.[0];
  const body = letter?.body || 'No letter content available.';

  return (
    <div className="max-w-3xl mx-auto p-10 font-serif leading-relaxed text-black text-sm">
      <div className="no-print mb-8 p-4 bg-surface border border-border rounded-xl flex items-center justify-between font-sans">
        <Link href="/advanced/letters" className="text-xs font-semibold text-primary-text hover:underline">
          ← Back to Letters
        </Link>
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.print()}
        >
          Print Letter
        </Button>
      </div>

      <pre className="font-serif whitespace-pre-wrap leading-relaxed text-base text-black font-normal">
        {body}
      </pre>
    </div>
  );
}
