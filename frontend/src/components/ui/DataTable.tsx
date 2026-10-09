import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  loading = false,
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-border bg-surface ${className}`.trim()}>
      <table className="data-table w-full">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                  col.className || ''
                }`.trim()}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-muted">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-primary-600 border-t-transparent animate-spin mb-2" />
                <p className="text-xs">Loading data...</p>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-muted">
                {emptyState || <span className="text-xs">No records found</span>}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
