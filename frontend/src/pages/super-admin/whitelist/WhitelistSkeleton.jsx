/** Whitelist requests before the list arrives. */
export default function WhitelistSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const columns = layout === 'desktop' ? 'sm:grid-cols-2' : 'grid-cols-1';

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading whitelist requests</span>

      <div className="mb-5">
        <Block className="h-3 w-20" />
        <Block className="h-7 w-56 mt-2" />
        <Block className="h-4 w-80 mt-2 max-w-full" />
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}
            className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
              min-w-[130px] flex-1">
            <Block className="h-8 w-12" />
            <Block className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      <Block className="h-3 w-28 mb-2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-spc-line">
              <div className="min-w-0">
                <Block className="h-4 w-44 max-w-full" />
                <Block className="h-3 w-56 mt-1.5 max-w-full" />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Block className="h-11 w-24" />
                <Block className="h-11 w-24" />
              </div>
            </div>
            <div className="p-4">
              <Block className="h-3 w-64 max-w-full mb-3" />
              <div className={`grid gap-3 ${columns}`}>
                {Array.from({ length: 2 }, (_, j) => (
                  <div key={j} className="p-3 rounded-spc-admin border border-spc-line-strong">
                    <Block className="h-3 w-24" />
                    <Block className="h-4 w-full mt-2" />
                    <Block className="h-4 w-2/3 mt-1.5" />
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
