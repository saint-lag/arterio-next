'use client';

export function AddressSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4 animate-pulse">
          <div className="h-4 w-48 bg-black/5 rounded mb-6" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-black/5 rounded" />
            <div className="h-12 bg-black/5 rounded" />
          </div>
          <div className="h-12 bg-black/5 rounded" />
          <div className="h-12 bg-black/5 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-black/5 rounded" />
            <div className="h-12 bg-black/5 rounded" />
          </div>
          <div className="h-12 w-40 bg-black/5 rounded" />
        </div>
      ))}
    </div>
  );
}
