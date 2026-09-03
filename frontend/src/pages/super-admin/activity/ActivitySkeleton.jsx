/** The audit trail before it arrives. */
export default function ActivitySkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const columns = layout === 'desktop' ? 'lg:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the activity log</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-14" />
          <Block className="h-7 w-44 mt-2" />
          <Block className="h-4 w-52 mt-2" />
        </div>
        <div className="flex gap-2">
          <Block className="h-11 w-20" />
          <Block className="h-11 w-20" />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}
            className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
              min-w-[120px] flex-1">
            <Block className="h-8 w-14" />
            <Block className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
        <Block className="h-3 w-32 mb-2" />
        <div className={`grid grid-cols-1 ${columns} gap-3`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <Block className="h-3 w-16" />
              <Block className="h-11 w-full mt-1.5" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Block className="h-11 w-24" />
          <Block className="h-11 w-24" />
        </div>
      </div>

      <Block className="h-3 w-20 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        <div className="px-4 py-3 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
          <Block className="h-3 w-40" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 px-4 py-3.5
            border-b border-spc-line last:border-b-0">
            <div className="min-w-0 flex-1">
              <Block className="h-4 w-40 max-w-full" />
              <Block className="h-3 w-52 mt-1.5 max-w-full" />
            </div>
            {layout === 'desktop' && <Block className="h-3 w-32 flex-shrink-0" />}
            <Block className="h-11 w-11 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
