/**
 * PRN Ranges before its request lands. Group headings only — the groups are
 * collapsed by default, so standing in for open tables would jump the page.
 */
export default function RangesSkeleton({ layout = 'desktop' }) {
  const filterColumns = layout === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading PRN ranges</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-20" />
          <Block className="h-7 w-44 mt-2" />
          <Block className="h-4 w-80 mt-2 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Block className="h-11 w-36" />
          <Block className="h-11 w-28" />
        </div>
      </div>

      <div className={`grid ${filterColumns} gap-3 mb-4`}>
        <Block className="h-11 w-full" />
        <Block className="h-11 w-full" />
      </div>

      <div className="flex items-center justify-between gap-3 mb-2">
        <Block className="h-3 w-32" />
        <div className="flex gap-2">
          <Block className="h-11 w-28" />
          <Block className="h-11 w-28" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <div className="flex items-center gap-3 px-4 py-3">
              <Block className="w-4 h-4 flex-shrink-0" />
              <Block className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Block className="h-4 w-56 max-w-full" />
                <Block className="h-3 w-40 mt-1.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
