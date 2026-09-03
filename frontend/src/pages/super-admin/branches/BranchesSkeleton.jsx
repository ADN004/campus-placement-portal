/**
 * College Branches before its three requests land. Same summary row, same
 * filters, same register shape per device.
 */
export default function BranchesSkeleton({ layout = 'desktop' }) {
  const isTable = layout === 'desktop';
  const summaryColumns = isTable ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const filterColumns = layout === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading colleges and their branches</span>

      <div className="mb-5">
        <Block className="h-3 w-20" />
        <Block className="h-7 w-56 mt-2" />
        <Block className="h-4 w-72 mt-2 max-w-full" />
      </div>

      <div className={`grid grid-cols-2 ${summaryColumns} gap-3 mb-5`}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="h-8 w-14" />
            <Block className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      <div className={`grid ${filterColumns} gap-3 mb-4`}>
        <Block className="h-11 w-full" />
        <Block className="h-11 w-full" />
      </div>

      <Block className="h-3 w-32 mb-2" />

      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        {isTable && (
          <div className="flex gap-4 px-4 py-2.5 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
            {['w-28', 'w-20', 'w-24', 'w-32'].map((w) => <Block key={w} className={`h-3 ${w}`} />)}
          </div>
        )}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
            {isTable ? (
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Block className="h-4 w-52" />
                  <Block className="h-3 w-20 mt-1.5" />
                </div>
                <Block className="h-3 w-28" />
                <Block className="h-3 w-24" />
                <Block className="h-6 w-40" />
                <Block className="h-11 w-28" />
              </div>
            ) : (
              <>
                <Block className="h-4 w-48" />
                <Block className="h-3 w-36 mt-1.5" />
                <Block className="h-6 w-full mt-2.5 max-w-xs" />
                <Block className="h-11 w-full mt-3" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
