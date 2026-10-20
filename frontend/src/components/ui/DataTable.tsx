'use client';
import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  className?: string;
  /** Hide in mobile card view if true */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  onRowClick?: (item: T) => void;
  /** If true, renders card list below 768px (md breakpoint). Defaults to true */
  responsiveCards?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  loading = false,
  className = '',
  onRowClick,
  responsiveCards = true,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-border bg-surface p-8 text-center text-muted ${className}`.trim()}>
        <span className="inline-block w-5 h-5 rounded-full border-2 border-primary-600 border-t-transparent animate-spin mb-2" />
        <p className="text-xs">Loading records...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`rounded-xl border border-border bg-surface p-8 text-center text-muted ${className}`.trim()}>
        {emptyState || <span className="text-xs">No records found</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {/* Mobile Cards View (< 768px) */}
      {responsiveCards && (
        <div className="md:hidden space-y-2.5">
          {data.map((item, rowIdx) => (
            <div
              key={keyExtractor(item, rowIdx)}
              onClick={() => onRowClick?.(item)}
              className={`p-3.5 rounded-xl border border-border bg-surface ${
                onRowClick ? 'cursor-pointer hover:bg-surface-hover/70 transition-colors' : ''
              } space-y-2`}
            >
              {columns
                .filter(col => !col.hideOnMobile)
                .map(col => {
                  const val = (item as any)[col.key];
                  const content = col.render ? col.render(item, rowIdx) : val;
                  return (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-2 text-xs border-b border-border/40 pb-1.5 last:border-b-0 last:pb-0"
                    >
                      <span className="text-muted font-medium">{col.header}</span>
                      <span className={`font-semibold text-text ${col.isNumeric ? 'num' : ''}`}>
                        {content}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View (>= 768px, or everywhere if responsiveCards=false) */}
      <div
        className={`${
          responsiveCards ? 'hidden md:block' : ''
        } overflow-x-auto rounded-xl border border-border bg-surface`}
      >
        <table className="data-table w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`.trim()}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-surface-hover/70 transition-colors' : ''}
              >
                {columns.map(col => {
                  const val = (item as any)[col.key];
                  const content = col.render ? col.render(item, rowIdx) : val;
                  return (
                    <td
                      key={col.key}
                      className={`${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.isNumeric ? 'num' : ''} ${col.className || ''}`.trim()}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
