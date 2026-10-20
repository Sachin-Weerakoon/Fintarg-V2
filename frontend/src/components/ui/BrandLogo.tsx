import React from 'react';
import {
  BRAND_LOGO_FULL_DARK,
  BRAND_LOGO_FULL_LIGHT,
  BRAND_LOGO_ICON,
} from './brandAssets';

export interface BrandLogoProps {
  /** `full` = F mark + wordmark, `icon` = F mark only */
  variant?: 'full' | 'icon';
  /** Use the dark-ink wordmark (for light surfaces). Defaults to the light wordmark for dark chrome. */
  onLight?: boolean;
  /** Rendered height in px */
  height?: number;
  className?: string;
}

export function BrandLogo({
  variant = 'full',
  onLight = false,
  height = 32,
  className = '',
}: BrandLogoProps) {
  if (variant === 'icon') {
    const width = Math.round((height * 169) / 163);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 169 163"
        height={height}
        width={width}
        role="img"
        aria-label="Fintarg"
        className={`inline-block select-none flex-shrink-0 transition-transform duration-200 hover:scale-[1.03] ${className}`.trim()}
      >
        <title>Fintarg</title>
        <image href={BRAND_LOGO_ICON} width="169" height="163" />
      </svg>
    );
  }

  // Full brand logo (Stylized gradient F + "Fint" + "targ"):
  const width = Math.round((height * 427) / 164);
  const src = onLight ? BRAND_LOGO_FULL_LIGHT : BRAND_LOGO_FULL_DARK;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 427 164"
      height={height}
      width={width}
      role="img"
      aria-label="Fintarg"
      className={`inline-block select-none flex-shrink-0 transition-opacity duration-150 ${className}`.trim()}
    >
      <title>Fintarg</title>
      <image href={src} width="427" height="164" />
    </svg>
  );
}
