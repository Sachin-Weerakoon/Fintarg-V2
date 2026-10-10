'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/store';

export default function PrintLetterPage() {
  const params = useParams();
  const { state } = useApp();
  const id = params?.id as string;

  const letter = state.letters?.find(l => l.id === id) || state.letters?.[0];
  const body = letter?.body || 'No letter content available.';

  return (
    <div className="max-w-3xl mx-auto p-10 font-serif leading-relaxed text-black text-sm">
      <div className="no-print mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-sans">
        <Link href="/advanced/letters" className="text-xs font-semibold text-teal-700">
          ← Back to Letters
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold cursor-pointer"
        >
          Print Letter
        </button>
      </div>

      <pre className="font-serif whitespace-pre-wrap leading-relaxed text-base text-black font-normal">
        {body}
      </pre>
    </div>
  );
}
