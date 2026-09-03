/** One drive's applicants, before the request lands. */
export default function ApplicantsSkeleton({ layout = 'desktop' }) {
  const isTable = layout === 'desktop';
  const statColumns = isTable ? 'lg:grid-cols-6' : 'sm:grid-cols-3';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the applicants</span>
      <Block className="h-11 w-36 mb-2" />
      <div className="mb-5">
        <Block className="h-3 w-32" />
        <Block className="h-7 w-72 mt-2 max-w-full" />
        <Block className="h-4 w-56 mt-2" />
      </div>
      <div className={`grid grid-cols-2 ${statColumns} gap-3 mb-5`}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="h-8 w-12" />
            <Block className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-5">
        <div className="px-4 py-3 border-b border-spc-line"><Block className="h-4 w-32" /></div>
        <div className="p-4 space-y-2">
          <Block className="h-3 w-48" />
          <Block className="h-3 w-40" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {['w-24', 'w-32', 'w-32'].map((w) => <Block key={w} className={`h-11 ${w}`} />)}
      </div>
      <Block className="h-3 w-32 mb-2" />
      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        {isTable && (
          <div className="flex gap-4 px-4 py-2.5 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
            {['w-16', 'w-24', 'w-32', 'w-20', 'w-28', 'w-20', 'w-10', 'w-14', 'w-20', 'w-16'].map((w) => (
              <Block key={w} className={`h-3 ${w}`} />
            ))}
          </div>
        )}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
            {isTable ? (
              <div className="flex items-center gap-4">
                <Block className="h-4 w-24" />
                <Block className="h-4 w-32" />
                <Block className="h-3 w-40" />
                <Block className="h-3 w-24" />
                <Block className="h-3 w-28" />
                <Block className="h-3 w-20" />
              </div>
            ) : (
              <>
                <Block className="h-4 w-28" />
                <Block className="h-4 w-40 mt-1.5" />
                <Block className="h-3 w-48 mt-2" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
