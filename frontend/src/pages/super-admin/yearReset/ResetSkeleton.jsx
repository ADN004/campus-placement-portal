/** The reset preview before its counts arrive. */
export default function ResetSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const grid = layout === 'desktop' ? 'lg:grid-cols-3 sm:grid-cols-2' : 'sm:grid-cols-2';

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading what the reset would change</span>

      <div className="mb-5">
        <Block className="h-3 w-14" />
        <Block className="h-7 w-64 mt-2 max-w-full" />
        <Block className="h-4 w-96 mt-2 max-w-full" />
      </div>

      <div className="flex items-center gap-2 mb-5">
        {Array.from({ length: 3 }, (_, i) => <Block key={i} className="h-5 w-20" />)}
      </div>

      <Block className="h-20 w-full mb-4" />

      {Array.from({ length: 2 }, (_, panel) => (
        <div key={panel}
          className="bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-4">
          <div className="px-4 py-3 border-b border-spc-line">
            <Block className="h-4 w-48" />
          </div>
          <div className={`p-4 grid grid-cols-1 ${grid} gap-3`}>
            {Array.from({ length: panel === 0 ? 9 : 3 }, (_, i) => (
              <Block key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ))}

      <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin p-4">
        <Block className="h-3 w-32 mb-2" />
        <Block className="h-11 w-56 max-w-full" />
      </div>
    </div>
  );
}
