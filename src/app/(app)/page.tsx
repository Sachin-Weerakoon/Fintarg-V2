import { Metadata } from 'next';
import AppLayoutWrapper from './layout';
import DashboardClient from '@/components/DashboardClient';

export const metadata: Metadata = { title: 'Fintarg' };

export default function RootPage() {
  return <AppLayoutWrapper><DashboardClient /></AppLayoutWrapper>;
}
