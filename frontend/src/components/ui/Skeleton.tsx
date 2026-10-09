import React from 'react';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const variantClasses: Record<SkeletonVariant, string> = {
    text: 'h-4 w-full rounded-md',
    rect: 'w-full rounded-xl',
    circle: 'rounded-full flex-shrink-0',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      aria-hidden="true"
      className={`skeleton ${variantClasses[variant]} ${className}`.trim()}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="40%" height={16} />
        <Skeleton variant="circle" width={36} height={36} />
      </div>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="text" width="30%" height={14} />
    </div>
  );
}
