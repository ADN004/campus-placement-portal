/** The job list before it arrives. */
export default function JobsSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading jobs</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-12" />
          <Block className="h-7 w-24 mt-2" />
          <Block className="h-4 w-96 mt-2 max-w-full" />
        </div>
        <Block className="h-11 w-28" />
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}
            className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
              min-w-[130px] flex-1">
            <Block className="h-8 w-12" />
            <Block className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      <Block className="h-3 w-24 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        <div className="px-4 py-3 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
          <Block className="h-3 w-56" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 px-4 py-3.5
            border-b border-spc-line last:border-b-0">
            <div className="min-w-0 flex-1">
              <Block className="h-4 w-52 max-w-full" />
              <Block className="h-3 w-32 mt-1.5" />
            </div>
            {layout === 'desktop' && (
              <>
                <Block className="h-3 w-24 flex-shrink-0" />
                <Block className="h-3 w-20 flex-shrink-0" />
              </>
            )}
            <Block className="h-8 w-40 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
