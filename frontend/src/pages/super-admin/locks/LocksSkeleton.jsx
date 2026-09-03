/** The lock table before it arrives. */
export default function LocksSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading college locks</span>

      <div className="mb-5">
        <Block className="h-3 w-14" />
        <Block className="h-7 w-28 mt-2" />
        <Block className="h-4 w-96 mt-2 max-w-full" />
      </div>

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
        <Block className="h-4 w-full" />
        <Block className="h-4 w-3/4 mt-2" />
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}
            className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
              min-w-[140px] flex-1">
            <Block className="h-8 w-10" />
            <Block className="h-3 w-28 mt-2" />
          </div>
        ))}
      </div>

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
        <Block className="h-3 w-32 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="p-3 rounded-spc-admin-sm border border-spc-line-strong">
              <Block className="h-3 w-28" />
              <div className="flex gap-2 mt-2">
                <Block className="h-11 flex-1" />
                <Block className="h-11 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Block className="h-3 w-24 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        <div className="px-4 py-3 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
          <Block className="h-3 w-56" />
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 px-4 py-4
            border-b border-spc-line last:border-b-0">
            <div className="min-w-0 flex-1">
              <Block className="h-4 w-56 max-w-full" />
              <Block className="h-3 w-24 mt-1.5" />
            </div>
            {layout === 'desktop' && (
              <>
                <Block className="h-16 w-32 flex-shrink-0" />
                <Block className="h-16 w-32 flex-shrink-0" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
