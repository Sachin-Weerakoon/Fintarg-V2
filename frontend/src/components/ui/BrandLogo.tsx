import React, { useId } from 'react';

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
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `fintarg-grad-${safeId}`;
  const shadowId = `fintarg-shadow-${safeId}`;

  // If icon-only variant:
  if (variant === 'icon') {
    const width = Math.round((height * 52) / 56);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 52 56"
        fill="none"
        height={height}
        width={width}
        role="img"
        aria-label="Fintarg"
        className={`inline-block select-none flex-shrink-0 transition-transform duration-200 hover:scale-[1.03] ${className}`.trim()}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0FA3B1" />
            <stop offset="100%" stopColor="#0A6D78" />
          </linearGradient>
          <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F1D32" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`}>
          <rect x="4" y="6" width="44" height="44" rx="12" fill={`url(#${gradId})`} />
          <path
            d="M28 14L16 28h10l-2 14 12-14H26l2-14z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  // Full brand logo (Shield Mark + Wordmark + Version badge):
  const width = Math.round((height * 240) / 56);
  const textColor = onLight ? '#0F172A' : '#FFFFFF';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 56"
      fill="none"
      height={height}
      width={width}
      role="img"
      aria-label="Fintarg"
      className={`inline-block select-none flex-shrink-0 transition-opacity duration-150 ${className}`.trim()}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0FA3B1" />
          <stop offset="100%" stopColor="#0A6D78" />
        </linearGradient>
        <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F1D32" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Emblem Mark Icon */}
      <g filter={`url(#${shadowId})`}>
        <rect x="4" y="6" width="44" height="44" rx="12" fill={`url(#${gradId})`} />
        {/* Bolt Symbol */}
        <path
          d="M28 14L16 28h10l-2 14 12-14H26l2-14z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Wordmark "Fintarg" */}
      <text
        x="60"
        y="36"
        fontFamily="var(--font-sans), Poppins, system-ui, -apple-system, sans-serif"
        fontSize="25"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-0.5"
      >
        Fintarg
      </text>

      {/* Version Tag Badge */}
      <rect
        x="168"
        y="21"
        width="42"
        height="18"
        rx="5"
        fill="#0FA3B1"
        fillOpacity="0.16"
        stroke="#0FA3B1"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <text
        x="175"
        y="34"
        fontFamily="var(--font-sans), Poppins, system-ui, -apple-system, sans-serif"
        fontSize="10.5"
        fontWeight="700"
        fill="#0FA3B1"
        letterSpacing="0.5"
      >
        v2.0
      </text>
    </svg>
  );
}
