/** The range's students before the request lands. */
export default function RangeStudentsSkeleton({ layout = 'desktop' }) {
  const isTable = layout === 'desktop';
  const columns = isTable ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the students in this range</span>

      <Block className="h-11 w-44 mb-2" />

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-20" />
          <Block className="h-7 w-64 mt-2" />
          <Block className="h-4 w-48 mt-2" />
        </div>
        <div className="flex gap-2">
          <Block className="h-11 w-24" />
          <Block className="h-11 w-24" />
        </div>
      </div>

      <div className={`grid grid-cols-2 ${columns} gap-3 mb-5`}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="h-8 w-14" />
            <Block className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      <Block className="h-3 w-24 mb-2" />

      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
        {isTable && (
          <div className="flex gap-4 px-4 py-2.5 bg-spc-surface-2 border-b-2 border-spc-rule-structural">
            {['w-16', 'w-28', 'w-36', 'w-28', 'w-20', 'w-20', 'w-12', 'w-16', 'w-20'].map((w) => (
              <Block key={w} className={`h-3 ${w}`} />
            ))}
          </div>
        )}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
            {isTable ? (
              <div className="flex items-center gap-4">
                <Block className="h-4 w-24" />
                <Block className="h-4 w-36" />
                <Block className="h-3 w-44" />
                <Block className="h-3 w-32" />
                <Block className="h-3 w-24" />
                <Block className="h-3 w-20" />
                <Block className="h-3 w-10" />
                <Block className="h-3 w-16" />
              </div>
            ) : (
              <>
                <Block className="h-4 w-28" />
                <Block className="h-4 w-40 mt-1.5" />
                <Block className="h-3 w-52 mt-2 max-w-full" />
                <Block className="h-3 w-44 mt-1.5" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
