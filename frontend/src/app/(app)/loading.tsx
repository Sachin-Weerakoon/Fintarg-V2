export const dynamic = 'force-dynamic';

export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="page-loading-spinner" />
      <span>Loading…</span>
    </div>
  );
}
