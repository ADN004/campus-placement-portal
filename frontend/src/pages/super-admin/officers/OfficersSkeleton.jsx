/** The officer list before it arrives. */
export default function OfficersSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading placement officers</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-14" />
          <Block className="h-7 w-64 mt-2 max-w-full" />
          <Block className="h-4 w-72 mt-2 max-w-full" />
        </div>
        <Block className="h-11 w-32" />
      </div>

      <div className="flex gap-3 flex-wrap mb-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}
            className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
              min-w-[120px] flex-1">
            <Block className="h-8 w-12" />
            <Block className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
        <Block className="h-3 w-28 mb-2" />
        <div className={`grid grid-cols-1 ${layout === 'desktop' ? 'sm:grid-cols-2' : ''} gap-3`}>
          {Array.from({ length: 2 }, (_, i) => <Block key={i} className="h-11 w-full" />)}
        </div>
      </div>

      <Block className="h-3 w-24 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        <div className="px-4 py-3 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
          <Block className="h-3 w-52" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5
            border-b border-spc-line last:border-b-0">
            <div className="min-w-0 flex-1">
              <Block className="h-4 w-40 max-w-full" />
              <Block className="h-3 w-52 mt-1.5 max-w-full" />
            </div>
            {layout === 'desktop' && <Block className="h-3 w-16 flex-shrink-0" />}
            <Block className="h-8 w-40 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
