import { Poppins } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fintarg',
  description: 'Personal finance and life management for Sri Lanka',
  robots: 'noindex',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
