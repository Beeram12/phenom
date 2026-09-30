export default function Loading() {
  return (
    <div className="container-page py-14" aria-busy="true" aria-label="Loading">
      <div className="bg-sand h-10 w-56 animate-pulse rounded-lg" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="bg-sand aspect-[4/3] animate-pulse" />
            <div className="space-y-3 p-5">
              <div className="bg-sand h-5 w-2/3 animate-pulse rounded" />
              <div className="bg-sand h-4 w-full animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
