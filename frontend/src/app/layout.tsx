import { Poppins, Noto_Sans_Sinhala, Noto_Sans_Tamil } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sinhala',
  preload: false,
  display: 'swap',
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-tamil',
  preload: false,
  display: 'swap',
});

import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';

export const metadata: Metadata = {
  title: 'Fintarg',
  description: 'Personal finance and life management for Sri Lanka',
  robots: 'noindex',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${notoSinhala.variable} ${notoTamil.variable}`}>
      <body className="font-sans">
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
