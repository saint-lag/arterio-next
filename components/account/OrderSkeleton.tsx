'use client';

interface OrderSkeletonProps {
  count?: number;
}

export function OrderSkeleton({ count = 3 }: OrderSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 border border-black/10 animate-pulse"
        >
          <div>
            <div className="h-4 w-32 bg-black/5 rounded" />
            <div className="h-3 w-24 bg-black/5 rounded mt-2" />
          </div>
          <div className="text-right">
            <div className="h-4 w-20 bg-black/5 rounded" />
            <div className="h-3 w-28 bg-black/5 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
