import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  asH1?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  asH1 = true,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80 ${className}`.trim()}>
      <div className="space-y-1">
        {eyebrow && (
          <div className="text-xs uppercase tracking-wider font-semibold text-primary-text">
            {eyebrow}
          </div>
        )}
        {asH1 ? (
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {title}
          </h1>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-text">
            {title}
          </div>
        )}
        {description && (
          <p className="text-xs sm:text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
