'use client';

import React from 'react';
import { BrandLogo } from './BrandLogo';

export interface FormalLetterSheetProps {
  body: string;
  refNumber?: string;
  date?: string;
  mode?: 'personal' | 'business';
  companyName?: string;
  companyBr?: string;
  companyTin?: string;
  companyAddress?: string;
  companyContact?: string;
  bankAccountDetails?: {
    bankName: string;
    accountNumber: string;
    branch?: string;
  };
  className?: string;
}

export function FormalLetterSheet({
  body,
  refNumber,
  date,
  mode = 'personal',
  companyName,
  companyBr,
  companyTin,
  companyAddress,
  companyContact,
  bankAccountDetails,
  className = '',
}: FormalLetterSheetProps) {
  const effectiveRef = refNumber || 'FNT-LTR-' + (date ? date.replace(/[^0-9]/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const effectiveDate = date || new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });

  // Clean and split body into logical blocks
  const blocks = (body || '')
    .trim()
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  return (
    <div
      className={`bg-white text-slate-900 border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden print:w-full print:max-w-none print:border-0 print:shadow-none print:rounded-none print:m-0 print:p-0 ${className}`.trim()}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Top brand identity gradient accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0FA3B1] via-[#35C2D0] to-[#0A6D78]" />

      <div className="p-8 sm:p-12 print:p-0">
        {/* Formal Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
          <div>
            <BrandLogo variant="full" onLight height={34} />
            <div className="text-[11px] font-bold text-[#0A6D78] uppercase tracking-wider mt-2 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0FA3B1]" />
              <span>Official Financial Correspondence</span>
              {mode === 'business' && companyName && (
                <span className="text-slate-500 font-bold">· {companyName}</span>
              )}
            </div>
          </div>

          <div className="sm:text-right text-xs text-slate-500 font-sans space-y-1">
            <div className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight num">
              {effectiveRef}
            </div>
            <div className="text-slate-600 font-medium">{effectiveDate}</div>
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0A6D78] bg-[#E6F6F8] border border-[#0FA3B1]/25 px-2 py-0.5 rounded-md mt-0.5 select-none">
              <span>✓ Verified Document</span>
            </div>
          </div>
        </div>

        {/* Corporate Entity Details Bar */}
        {mode === 'business' && companyName && (
          <div className="mb-8 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-sans text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-extrabold text-slate-900 text-sm">{companyName}</span>
              {companyAddress && <span className="text-slate-600"> · {companyAddress}</span>}
            </div>
            <div className="flex items-center gap-3 text-slate-600 font-medium flex-wrap">
              {companyBr && <span><strong className="text-slate-800">BR:</strong> {companyBr}</span>}
              {companyTin && <span><strong className="text-slate-800">TIN:</strong> {companyTin}</span>}
              {companyContact && <span><strong className="text-slate-800">Tel:</strong> {companyContact}</span>}
            </div>
          </div>
        )}

        {bankAccountDetails && (
          <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-sans text-slate-600">
            <div className="font-extrabold text-slate-900 mb-1">Connected Bank Account</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong className="text-slate-800">Bank:</strong> {bankAccountDetails.bankName}</span>
              <span><strong className="text-slate-800">Account:</strong> {bankAccountDetails.accountNumber}</span>
              {bankAccountDetails.branch && (
                <span><strong className="text-slate-800">Branch:</strong> {bankAccountDetails.branch}</span>
              )}
            </div>
          </div>
        )}

        {/* Formatted Letter Body */}
        <div className="space-y-4 font-serif text-[14px] sm:text-[15px] leading-relaxed text-slate-800">
          {blocks.map((block, idx) => {
            const isSubject = /^re:\s*|^subject:\s*/i.test(block);
            const isSignoff = /^yours\s+(faithfully|sincerely)|kind\s+regards|best\s+regards|sincerely/i.test(block);

            if (isSubject) {
              return (
                <div
                  key={idx}
                  className="font-bold text-sm tracking-wide text-[#0A6D78] uppercase py-2.5 px-3.5 bg-[#E6F6F8]/60 border-l-4 border-[#0FA3B1] rounded-r-lg my-4 font-sans"
                >
                  {block}
                </div>
              );
            }

            if (isSignoff) {
              const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
              const signoffText = lines[0];
              const signerName = lines.slice(1).join(' ') || '';

              return (
                <div key={idx} className="mt-8 pt-4">
                  <div className="text-slate-800 font-serif italic mb-6">{signoffText}</div>
                  <div className="w-48 h-px bg-slate-300 my-4" />
                  {signerName && (
                    <div className="font-bold text-slate-900 font-sans text-sm">{signerName}</div>
                  )}
                  <div className="text-xs text-slate-500 font-sans mt-0.5">
                    {mode === 'business' ? 'Authorized Signatory' : 'Account Holder'}
                  </div>
                </div>
              );
            }

            // Normal paragraph or address block
            return (
              <div key={idx} className="whitespace-pre-line leading-relaxed">
                {block}
              </div>
            );
          })}
        </div>

        {/* Formal Footer */}
        <div className="border-t border-slate-200/90 pt-6 mt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400 font-sans">
          <div className="flex items-center gap-2">
            <BrandLogo variant="icon" height={16} />
            <span className="font-medium text-slate-500">
              Prepared & issued via Fintarg Financial OS · Confidential
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Sri Lanka · Verified Correspondence · Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
}
