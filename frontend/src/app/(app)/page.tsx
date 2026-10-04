import { Metadata } from 'next';
import DashboardClient from '@/components/DashboardClient';

export const metadata: Metadata = { title: 'Fintarg' };

export default function RootPage() {
  return <DashboardClient />;
}
