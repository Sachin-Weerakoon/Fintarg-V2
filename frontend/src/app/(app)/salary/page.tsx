'use client';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SalaryWorkspace } from '../advanced/_components/SalaryWorkspace';

export default function SalaryPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Personal Inflows"
        title="Salary & Payday Planning"
      />
      <SalaryWorkspace />
    </PageContainer>
  );
}
