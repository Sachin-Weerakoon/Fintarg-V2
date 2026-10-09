import { PageContainer } from '@/components/ui/PageContainer';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export const dynamic = 'force-dynamic';

export default function Loading() {
  return (
    <PageContainer>
      <div className="pb-6 border-b border-border/80 space-y-2">
        <Skeleton variant="text" width="20%" height={14} />
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="text" width="55%" height={16} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="card p-6 space-y-4">
          <Skeleton variant="text" width="35%" height={20} />
          <Skeleton variant="rect" height={160} />
          <Skeleton variant="rect" height={120} />
        </div>
        <div className="card p-6 space-y-4">
          <Skeleton variant="text" width="50%" height={20} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
        </div>
      </div>
    </PageContainer>
  );
}
