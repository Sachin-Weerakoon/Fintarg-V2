'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/store';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FormalLetterSheet } from '@/components/ui/FormalLetterSheet';

export default function PrintLetterPage() {
  const params = useParams();
  const { state } = useApp();
  const id = params?.id as string;
  const [cachedDraft, setCachedDraft] = useState<{ body: string; mode?: 'personal' | 'business'; date?: string; companyId?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fintarg_current_letter');
      if (raw) {
        setCachedDraft(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const savedLetter = state.letters?.find(l => l.id === id) || (id === 'new' && cachedDraft ? null : state.letters?.[state.letters.length - 1]);
  const letter = savedLetter || cachedDraft || state.letters?.[0];
  const body = letter?.body || 'No letter content available.';
  const mode = letter?.mode || 'personal';
  const company = state.companies?.find(c => c.id === letter?.companyId);

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-8 print:p-0 print:bg-white text-text">
      {/* Top action bar - hidden during print */}
      <div className="no-print max-w-4xl mx-auto mb-6 p-4 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-sm font-sans">
        <Link
          href="/advanced/letters"
          className="text-xs font-semibold text-primary-text hover:underline flex items-center gap-1.5"
        >
          <Icon name="arrow-left" size={14} />
          Back to Letters
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            iconLeft={<Icon name="download" size={14} />}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Official Formatted Letter Sheet with Brand Identity */}
      <FormalLetterSheet
        body={body}
        refNumber={savedLetter?.id ? `FNT-LTR-${savedLetter.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : undefined}
        date={letter?.date}
        mode={mode}
        companyName={company?.name}
        companyBr={company?.brNumber}
        companyTin={company?.tinNumber}
        companyAddress={company?.address}
        companyContact={company?.contact}
        className="max-w-4xl mx-auto"
      />
    </div>
  );
}
