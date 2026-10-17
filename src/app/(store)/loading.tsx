export default function Loading() {
  return (
    <div className="container-page space-y-4 py-8" role="status" aria-label="Loading">
      <div className="skeleton-shimmer h-8 w-64 rounded" />
      <div className="skeleton-shimmer h-64 w-full rounded-xl" />
    </div>
  );
}
