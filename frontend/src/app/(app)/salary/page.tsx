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
        description="Monitor gross pay, pay slip deductions, statutory EPF/ETF contributions, and automated payday savings allocation."
      />
      <SalaryWorkspace />
    </PageContainer>
  );
}
