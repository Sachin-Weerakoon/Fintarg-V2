'use client';
import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon, IconName } from '@/components/ui/Icon';
import { WorkOverview } from './WorkOverview';

export interface AdvancedHubProps {
  hasBusiness: boolean;
  onOpen: (tab: string) => void;
}

export function AdvancedHub({ hasBusiness, onOpen }: AdvancedHubProps) {
  const hubCards: {
    id: string;
    title: string;
    description: string;
    icon: IconName;
    badge?: string;
    isExternalRoute?: boolean;
    href?: string;
  }[] = [
    {
      id: 'letters',
      title: 'Legal & Bank Letters',
      description: 'Generate formatted letters for banks, employment verification, and official inquiries.',
      icon: 'file-text',
      badge: 'Templates',
      isExternalRoute: true,
      href: '/advanced/letters',
    },
    {
      id: 'medical',
      title: 'Medical Health Center',
      description: 'Track healthcare expenditures, lab reports, doctor consultations, and appointment reminders.',
      icon: 'heart',
      badge: 'Health',
      isExternalRoute: true,
      href: '/advanced/medical',
    },
    {
      id: 'agreements',
      title: 'Commercial Agreements',
      description: 'Maintain contracts, office leases, renewal deadlines, and signed PDF documentation.',
      icon: 'documents',
      badge: 'Contracts',
    },
    {
      id: 'businesses',
      title: 'Multi-Branch Operations',
      description: 'Enterprise branches, daily sales logs, operational overheads, and monthly targets.',
      icon: 'bank',
      badge: 'Enterprise',
    },
    {
      id: 'salary',
      title: 'Salary & Payday Plan',
      description: 'Multi-job pay slip deductions, EPF/ETF tracking, and automatic payday savings allocation.',
      icon: 'wallet',
      badge: 'Income',
    },
    {
      id: 'companies',
      title: 'Enterprise Entities',
      description: 'Register corporate entities with Sri Lankan BR numbers, TIN IDs, and registered offices.',
      icon: 'briefcase',
      badge: 'Registry',
    },
  ];

  const visibleCards = hubCards.filter(
    card => hasBusiness || (card.id !== 'businesses' && card.id !== 'companies' && card.id !== 'agreements')
  );

  return (
    <div className="space-y-6">
      {/* Top Pulse: Work & Enterprise Net Position */}
      <WorkOverview onOpen={onOpen} />

      {/* Feature Toolkits Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-text">Specialized Toolkits</h3>
            <p className="text-xs text-muted mt-0.5">
              Enterprise management, legal automation, and personal wellness tools
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map(card => {
            const cardContent = (
              <div className="p-5 flex flex-col justify-between h-full min-h-[170px] space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-tint text-primary-text group-hover:scale-105 transition-transform">
                    <Icon name={card.icon} size={20} />
                  </div>
                  {card.badge && (
                    <Badge tone="neutral" size="sm">
                      {card.badge}
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-text group-hover:text-primary-text transition-colors flex items-center justify-between">
                    <span>{card.title}</span>
                    <Icon
                      name="arrow-right"
                      size={14}
                      className="text-muted group-hover:text-primary-text group-hover:translate-x-0.5 transition-all"
                    />
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>
            );

            if (card.isExternalRoute && card.href) {
              return (
                <Link key={card.id} href={card.href} className="block group">
                  <Card hoverable className="p-0 h-full border-border">
                    {cardContent}
                  </Card>
                </Link>
              );
            }

            return (
              <div
                key={card.id}
                onClick={() => onOpen(card.id)}
                className="cursor-pointer group h-full"
              >
                <Card hoverable className="p-0 h-full border-border">
                  {cardContent}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
