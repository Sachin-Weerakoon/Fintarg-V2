import React from 'react';

export interface BrandLogoProps {
  /** `full` = F mark + wordmark, `icon` = F mark only */
  variant?: 'full' | 'icon';
  /** Use the dark-ink wordmark (for light surfaces). Defaults to the light wordmark for dark chrome. */
  onLight?: boolean;
  /** Rendered height in px */
  height?: number;
  className?: string;
}

export function BrandLogo({ variant = 'full', onLight = false, height = 32, className = '' }: BrandLogoProps) {
  const src =
    variant === 'icon'
      ? '/brand/fintarg-icon.png'
      : onLight
      ? '/brand/fintarg-logo-full-light.png'
      : '/brand/fintarg-logo-full.png';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Fintarg"
      height={height}
      style={{ height, width: 'auto' }}
      className={`object-contain select-none ${className}`.trim()}
      draggable={false}
    />
  );
}
