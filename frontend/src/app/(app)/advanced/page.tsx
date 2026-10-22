'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

import { AdvancedHub } from './_components/AdvancedHub';
import { BusinessWorkspace } from './_components/BusinessWorkspace';
import { SalaryWorkspace } from './_components/SalaryWorkspace';
import { AgreementsTab } from './_components/AgreementsTab';
import { CompaniesTab } from './_components/CompaniesTab';

type AdvancedTab = 'hub' | 'businesses' | 'salary' | 'agreements' | 'companies' | 'letters' | 'medical';

function AdvancedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams?.get('tab') as AdvancedTab) || 'hub';
  const { state } = useApp();
  const isBusinessPlan = state.profile.plan === 'business';
  const hasBusiness = state.profile.workMode !== 'salary' && isBusinessPlan;

  // Redirect legacy tabs to dedicated routes
  useEffect(() => {
    if (rawTab === 'letters') {
      router.replace('/advanced/letters');
    } else if (rawTab === 'medical') {
      router.replace('/advanced/medical');
    }
  }, [rawTab, router]);

  const activeTab: 'hub' | 'businesses' | 'salary' | 'agreements' | 'companies' =
    rawTab === 'letters' || rawTab === 'medical' ? 'hub' : rawTab;

  const setTab = (newTab: string) => {
    if (newTab === 'letters') {
      router.push('/advanced/letters');
      return;
    }
    if (newTab === 'medical') {
      router.push('/advanced/medical');
      return;
    }
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newTab === 'hub') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '/advanced', { scroll: false });
  };

  const showSalaryTab = state.profile.workMode === 'salary';
  const tabOptions = [
    { id: 'hub', label: 'Feature Hub', icon: <Icon name="home" size={15} /> },
    ...(hasBusiness
      ? [{ id: 'businesses', label: 'Businesses & Branches', icon: <Icon name="bank" size={15} /> }]
      : []),
    ...(showSalaryTab
      ? [{ id: 'salary', label: 'Salary & Payday', icon: <Icon name="wallet" size={15} /> }]
      : []),
    ...(hasBusiness
      ? [
          { id: 'agreements', label: 'Agreements', icon: <Icon name="documents" size={15} /> },
          { id: 'companies', label: 'Companies', icon: <Icon name="briefcase" size={15} /> },
        ]
      : []),
  ];

  const getPageMeta = () => {
    switch (activeTab) {
      case 'businesses':
        return { title: 'Enterprise & Branch Workspaces' };
      case 'salary':
        return { title: 'Salary & Payday Planning' };
      case 'agreements':
        return { title: 'Commercial Agreements & Contracts' };
      case 'companies':
        return { title: 'Enterprise Corporate Entities' };
      default:
        return { title: 'Advanced Features' };
    }
  };

  const meta = getPageMeta();

  return (
    <PageContainer>
      {/* Standard Page Header */}
      <PageHeader
        eyebrow="Toolkit Suite"
        title={meta.title}
        actions={
          activeTab !== 'hub' ? (
            <Button
              variant="secondary"
              onClick={() => setTab('hub')}
              iconLeft={<Icon name="arrow-left" size={16} />}
            >
              Back to Hub
            </Button>
          ) : undefined
        }
      />

      {/* Tabs navigation */}
      <SegmentedTabs
        options={tabOptions}
        value={activeTab}
        onChange={setTab}
        aria-label="Advanced feature sections"
      />

      {/* Tab Panels */}
      {activeTab === 'hub' && <AdvancedHub hasBusiness={hasBusiness} onOpen={setTab} />}
      {activeTab === 'businesses' && (
        isBusinessPlan ? (
          <BusinessWorkspace />
        ) : (
          <EmptyState
            icon={<Icon name="shield" size={28} className="text-primary-500" />}
            title="Business Edition Required"
            helper="Enterprise and branch workspaces require the Business edition of Fintarg. Upgrade your plan in Settings to unlock multi-branch operations."
            action={
              <Button variant="primary" size="sm" onClick={() => router.push('/settings')}>
                Upgrade in Settings
              </Button>
            }
          />
        )
      )}
      {activeTab === 'salary' && <SalaryWorkspace />}
      {activeTab === 'agreements' && (
        isBusinessPlan ? (
          <AgreementsTab />
        ) : (
          <EmptyState
            icon={<Icon name="shield" size={28} className="text-primary-500" />}
            title="Business Edition Required"
            helper="Commercial contract and agreement tracking requires the Business edition of Fintarg. Upgrade your plan in Settings to unlock agreement management."
            action={
              <Button variant="primary" size="sm" onClick={() => router.push('/settings')}>
                Upgrade in Settings
              </Button>
            }
          />
        )
      )}
      {activeTab === 'companies' && (
        isBusinessPlan ? (
          <CompaniesTab />
        ) : (
          <EmptyState
            icon={<Icon name="shield" size={28} className="text-primary-500" />}
            title="Business Edition Required"
            helper="Corporate legal entities registration requires the Business edition of Fintarg. Upgrade your plan in Settings to register enterprise corporate entities."
            action={
              <Button variant="primary" size="sm" onClick={() => router.push('/settings')}>
                Upgrade in Settings
              </Button>
            }
          />
        )
      )}
    </PageContainer>
  );
}

export default function AdvancedPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-96" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          </div>
        </PageContainer>
      }
    >
      <AdvancedContent />
    </Suspense>
  );
}
