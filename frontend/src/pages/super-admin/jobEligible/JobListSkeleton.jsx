/** The drive list before the jobs arrive. */
export default function JobListSkeleton({ layout = 'desktop' }) {
  const columns = layout === 'desktop' ? 'sm:grid-cols-2 xl:grid-cols-3' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the drives</span>
      <div className="mb-5">
        <Block className="h-3 w-16" />
        <Block className="h-7 w-48 mt-2" />
        <Block className="h-4 w-64 mt-2 max-w-full" />
      </div>
      <Block className="h-11 w-full mb-4" />
      <Block className="h-3 w-28 mb-2" />
      <div className={`grid grid-cols-1 ${columns} gap-3`}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <Block className="h-4 w-44 max-w-full" />
            <Block className="h-3 w-32 mt-1.5" />
            <Block className="h-3 w-40 mt-3" />
            <Block className="h-3 w-28 mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
