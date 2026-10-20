'use client';
import React from 'react';
import { SectionHeader } from './SectionHeader';

export interface PageSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  action,
  badge,
  children,
  className = '',
  ...props
}: PageSectionProps) {
  return (
    <section className={`space-y-4 ${className}`.trim()} {...props}>
      {(title || description || action || badge) && (
        <SectionHeader
          title={title}
          description={description}
          action={action}
          badge={badge}
        />
      )}
      {children}
    </section>
  );
}
