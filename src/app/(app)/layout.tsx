import { getSessionUser } from '@/actions/auth';
import AppLayout from '@/components/AppLayout';

export default async function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <html>
        <body>
          <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/welcome');` }} />
        </body>
      </html>
    );
  }
  return <AppLayout user={user}>{children}</AppLayout>;
}
