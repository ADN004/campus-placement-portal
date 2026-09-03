/** The count export before its regions and colleges arrive. */
export default function CountsSkeleton() {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the student count export</span>

      <div className="mb-5">
        <Block className="h-3 w-16" />
        <Block className="h-7 w-52 mt-2" />
        <Block className="h-4 w-96 mt-2 max-w-full" />
      </div>

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin space-y-5">
        <div>
          <Block className="h-3 w-28 mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 2 }, (_, i) => <Block key={i} className="h-16 w-full" />)}
          </div>
        </div>

        <div>
          <Block className="h-3 w-28 mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_, i) => <Block key={i} className="h-12 w-full" />)}
          </div>
        </div>

        <div className="pt-4 border-t border-spc-line flex flex-wrap gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="min-w-[110px]">
              <Block className="h-3 w-16" />
              <Block className="h-7 w-14 mt-1.5" />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-spc-line flex gap-2">
          <Block className="h-11 w-24" />
          <Block className="h-11 w-24" />
        </div>
      </div>
    </div>
  );
}
