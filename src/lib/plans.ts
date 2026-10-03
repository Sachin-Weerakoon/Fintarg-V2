export type UserPlan = 'basic' | 'business';
export type WorkMode = 'salary' | 'business' | 'both';

export const PLANS = {
  basic: {
    features: ['personal_letters', 'documents', 'medical'] as const,
    label: 'Basic',
    description: 'Salary earners — personal letters, documents, and medical tracking.',
  },
  business: {
    features: ['personal_letters', 'business_letters', 'agreements', 'companies', 'branches', 'documents', 'medical'] as const,
    label: 'Business',
    description: 'Business owners — everything in Business plus company profiles, agreements, and branches.',
  },
} as const;

export function hasFeature(plan: 'basic' | 'business', feature: string): boolean {
  return PLANS[plan].features.includes(feature as any);
}
