import React from 'react';

export type PageContainerWidth = 'default' | 'narrow';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: PageContainerWidth;
  children: React.ReactNode;
}

export function PageContainer({
  width = 'default',
  className = '',
  children,
  ...props
}: PageContainerProps) {
  const widthClass = width === 'narrow' ? 'max-w-4xl' : 'max-w-6xl';

  return (
    <div
      className={`${widthClass} mx-auto space-y-6 w-full ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
