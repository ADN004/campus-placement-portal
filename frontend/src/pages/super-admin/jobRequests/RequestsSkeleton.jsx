/** Job requests before the list arrives. */
export default function RequestsSkeleton({ layout = 'desktop' }) {
  const columns = layout === 'desktop' ? 'sm:grid-cols-4' : 'sm:grid-cols-2';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading job requests</span>
      <div className="mb-5">
        <Block className="h-3 w-16" />
        <Block className="h-7 w-48 mt-2" />
        <Block className="h-4 w-72 mt-2 max-w-full" />
      </div>
      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-5 inline-block min-w-[180px]">
        <Block className="h-8 w-12" />
        <Block className="h-3 w-28 mt-2" />
      </div>
      <Block className="h-3 w-20 mb-2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-spc-line">
              <div className="min-w-0">
                <Block className="h-4 w-48 max-w-full" />
                <Block className="h-3 w-32 mt-1.5" />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Block className="h-11 w-24" />
                <Block className="h-11 w-24" />
              </div>
            </div>
            <div className="p-4">
              <Block className="h-3 w-64 max-w-full mb-3" />
              <div className={`grid grid-cols-2 ${columns} gap-3`}>
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j}>
                    <Block className="h-3 w-16" />
                    <Block className="h-4 w-20 mt-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
