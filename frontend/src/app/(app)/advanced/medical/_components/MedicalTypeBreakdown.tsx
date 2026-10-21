'use client';

import { Card } from '@/components/ui/Card';
import { CATEGORY_PALETTE, DonutChart } from '@/components/charts/Charts';
import { formatRs } from '@/store';
import { summariseByType } from '@/lib/medicalSummary';
import type { MedicalExpense } from '@/types';

export function MedicalTypeBreakdown({ expenses }: { expenses: MedicalExpense[] }) {
  const rows = summariseByType(expenses);
  if (rows.length === 0) {
    return null;
  }

  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-text">Spending by type</h3>
      <p className="mt-1 text-xs text-muted">
        A breakdown of medical expenses by type.
      </p>

      <div className="mt-4 flex flex-col items-center gap-5 md:flex-row md:items-center">
        <div className="flex w-full shrink-0 justify-center md:w-auto">
          <DonutChart
            data={rows.map((row, index) => ({
              label: row.type,
              value: row.total,
              color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
            }))}
            centerLabel="Total"
            centerValue={formatRs(total)}
          />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.type}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium text-text">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
                  }}
                />
                <span className="break-words">{row.type}</span>
              </span>
              <span className="num text-muted">{formatRs(row.total)}</span>
              <span className="num text-right font-bold text-text">{row.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
