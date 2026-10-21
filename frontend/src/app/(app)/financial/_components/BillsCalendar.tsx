'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { formatRs } from '@/utils/formatCurrency';
import { buildCalendarMonth, compactAmount, WEEKDAY_LABELS, type CalendarDay } from '@/lib/billsCalendar';
import { addMonths, monthLabel, monthOf, todayISO, type Obligation, type ObligationKind } from '@/lib/insights';

const KIND_LABELS: Record<ObligationKind, string> = {
  finance: 'Instalment',
  pawn: 'Pawn interest',
  'pawn-redeem': 'Redemption',
  loan: 'Loan',
  agreement: 'Agreement',
  reminder: 'Reminder',
};

const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface BillsCalendarProps {
  /** Obligations from upcomingObligations(); the window should cover every month the user can reach. */
  obligations: Obligation[];
  /** Local 'YYYY-MM-DD' (defaults to todayISO()). */
  today?: string;
  /** Earliest / latest 'YYYY-MM' reachable with the arrows (default: the current month only). */
  minMonth?: string;
  maxMonth?: string;
}

function dayLabel(d: CalendarDay): string {
  const [y, m] = d.date.split('-');
  const monthName = monthLabel(`${y}-${m}`).split(' ')[0];
  let label = `${d.day} ${monthName} ${y}`;
  if (d.items.length) label += `, ${d.items.length} ${d.items.length === 1 ? 'bill' : 'bills'}, ${formatRs(d.total)}`;
  if (d.overdue) label += ', overdue';
  return label;
}

export function BillsCalendar({ obligations, today = todayISO(), minMonth, maxMonth }: BillsCalendarProps) {
  const currentMonth = monthOf(today);
  const lo = minMonth ?? currentMonth;
  const hi = maxMonth ?? currentMonth;
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(today);

  const cal = useMemo(() => buildCalendarMonth(month, obligations, today), [month, obligations, today]);
  const days = cal.weeks.flat();
  const selectedDay = days.find(d => d.date === selected && d.inMonth) ?? null;

  const goTo = (next: string) => {
    setMonth(next);
    // Keep today selected in the current month; otherwise start with nothing selected.
    setSelected(next === currentMonth ? today : null);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-text">Upcoming bills</h3>
          <p className="text-xs text-muted mt-0.5">
            {cal.count > 0
              ? <>Due in {monthLabel(month)}: <span className="num font-semibold text-text">{formatRs(cal.total)}</span> · {cal.count} {cal.count === 1 ? 'item' : 'items'}</>
              : <>No bills due in {monthLabel(month)}</>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="!min-w-0 !px-2" onClick={() => goTo(addMonths(month, -1))} disabled={month <= lo} aria-label="Previous month">
            <Icon name="chevron-left" size={16} />
          </Button>
          <span className="text-xs font-semibold text-text whitespace-nowrap min-w-[72px] text-center">{monthLabel(month, 'short')}</span>
          <Button variant="ghost" size="sm" className="!min-w-0 !px-2" onClick={() => goTo(addMonths(month, 1))} disabled={month >= hi} aria-label="Next month">
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
          {WEEKDAY_LABELS.map(w => (
            <div key={w} className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">{w.slice(0, 2)}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Bills calendar, ${monthLabel(month)}`}>
          {days.map(d => {
            const isSelected = d.date === selected && d.inMonth;
            return (
              <Button
                key={d.date}
                variant="ghost"
                size="sm"
                disabled={!d.inMonth}
                aria-pressed={isSelected}
                aria-current={d.isToday ? 'date' : undefined}
                aria-label={dayLabel(d)}
                onClick={() => setSelected(d.date)}
                className={`!min-w-0 !min-h-0 !p-0 !rounded-lg h-11 sm:h-12 w-full !flex-col !gap-0.5 !items-center !justify-center ${
                  !d.inMonth ? '!opacity-35' : ''
                } ${isSelected ? '!bg-primary-500/15 !text-text ring-1 ring-primary-500' : ''} ${
                  d.isToday ? '!text-primary-text font-bold' : d.inMonth ? 'text-text' : ''
                }`}
              >
                <span className="text-xs leading-none num">{d.day}</span>
                {d.items.length > 0 ? (
                  <span className="flex items-center gap-0.5 leading-none">
                    <span className={`h-1.5 w-1.5 rounded-full ${d.overdue ? 'bg-danger-solid' : 'bg-primary-500'}`} aria-hidden="true" />
                    {d.total > 0 && (
                      <span className={`text-[9px] num font-semibold ${d.overdue ? 'text-danger-text' : 'text-muted'}`}>{compactAmount(d.total)}</span>
                    )}
                  </span>
                ) : (
                  <span className="h-1.5" aria-hidden="true" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-3" aria-live="polite">
        {selectedDay ? (
          <>
            <div className="text-xs font-semibold text-text mb-2">
              {WEEKDAY_LONG[days.indexOf(selectedDay) % 7]}, {selectedDay.day} {monthLabel(month)}
            </div>
            {selectedDay.items.length === 0 ? (
              <p className="text-xs text-muted">Nothing due on this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedDay.items.map(item => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-text truncate">{item.label}</span>
                        <span className="flex items-center gap-1.5 mt-0.5">
                          <Badge tone="neutral" size="sm">{KIND_LABELS[item.kind]}</Badge>
                          {selectedDay.overdue && <Badge tone="danger" size="sm">Overdue</Badge>}
                        </span>
                      </span>
                      <span className={`text-xs font-bold num shrink-0 ${selectedDay.overdue ? 'text-danger-text' : 'text-text'}`}>
                        {item.amount !== undefined ? formatRs(item.amount) : '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">
            {cal.count > 0 ? 'Select a day to see what is due.' : `No bills due in ${monthLabel(month)}.`}
          </p>
        )}
      </div>
    </Card>
  );
}
