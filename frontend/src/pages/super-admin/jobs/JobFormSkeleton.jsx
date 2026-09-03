/** The job editor before the job it is editing arrives. */
export default function JobFormSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const twoUp = layout === 'desktop' ? 'sm:grid-cols-2' : '';

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the job</span>

      <Block className="h-4 w-28 mb-3" />
      <div className="mb-5">
        <Block className="h-3 w-12" />
        <Block className="h-7 w-40 mt-2" />
        <Block className="h-4 w-72 mt-2 max-w-full" />
      </div>

      {[6, 8, 4, 6].map((rows, panel) => (
        <div key={panel}
          className="bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
          <div className="px-4 py-3 border-b border-spc-line">
            <Block className="h-4 w-40" />
          </div>
          <div className={`p-4 grid grid-cols-1 ${twoUp} gap-3`}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i}>
                <Block className="h-3 w-24" />
                <Block className="h-11 w-full mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin p-4
        flex justify-end gap-2">
        <Block className="h-11 w-24" />
        <Block className="h-11 w-32" />
      </div>
    </div>
  );
}
