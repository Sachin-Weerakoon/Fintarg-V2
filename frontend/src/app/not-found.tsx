import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <Card className="max-w-md w-full text-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-tint border border-primary-500/20 flex items-center justify-center text-primary-text mx-auto">
          <Icon name="info" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text">
            Page not found
          </h2>
          <p className="text-sm text-muted mt-1.5">
            The page you are looking for does not exist or may have been relocated.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Link href="/">
            <Button variant="primary">Return to Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
