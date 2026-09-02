/**
 * What the dashboard looks like before its two requests land.
 *
 * Shaped like the page it stands in for, at the same column counts, so nothing
 * jumps when the real thing arrives. Opaque, like everything else on the page —
 * a translucent skeleton over the ground would shimmer against the washes.
 */
export default function DashboardSkeleton({ layout = 'desktop' }) {
  const statColumns = layout === 'desktop' ? 'lg:grid-cols-4' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  const actionColumns = layout === 'desktop' ? 'lg:grid-cols-3' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  const regionColumns = layout === 'desktop' ? 'lg:grid-cols-5' : layout === 'tablet' ? 'sm:grid-cols-2' : '';

  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const Tile = ({ tall }) => (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
      <Block className="w-10 h-10 rounded-spc-admin-sm" />
      <Block className={`${tall ? 'h-9' : 'h-7'} w-20 mt-3`} />
      <Block className="h-4 w-28 mt-2" />
      <Block className="h-3 w-36 mt-1.5" />
    </div>
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the dashboard</span>

      <div className="mb-5">
        <Block className="h-3 w-32" />
        <Block className="h-7 w-72 mt-2" />
        <Block className="h-4 w-96 mt-2 max-w-full" />
      </div>

      <Block className="h-3 w-24 mb-2" />
      <div className={`grid grid-cols-1 ${statColumns} gap-3 mb-6`}>
        {Array.from({ length: 8 }, (_, i) => <Tile key={i} tall={layout !== 'mobile'} />)}
      </div>

      <Block className="h-3 w-36 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-6">
        <div className="px-4 py-3 border-b border-spc-line">
          <Block className="h-4 w-56" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-spc-line last:border-b-0">
            <Block className="w-9 h-9 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Block className="h-4 w-48" />
              <Block className="h-3 w-full mt-2 max-w-md" />
              <Block className="h-3 w-32 mt-2" />
            </div>
          </div>
        ))}
      </div>

      <Block className="h-3 w-28 mb-2" />
      <div className={`grid grid-cols-1 ${actionColumns} gap-3 mb-6`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="w-10 h-10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Block className="h-4 w-36" />
              <Block className="h-3 w-48 mt-2 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      <Block className="h-3 w-40 mb-2" />
      <div className={`grid grid-cols-1 ${regionColumns} gap-3`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="h-3 w-28" />
            <Block className="h-8 w-14 mt-2" />
            <Block className="h-3 w-16 mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
