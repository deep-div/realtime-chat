interface SkeletonProps {
  className?: string;
}

/** A pulsing placeholder block shown in place of content that's still loading. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
}
