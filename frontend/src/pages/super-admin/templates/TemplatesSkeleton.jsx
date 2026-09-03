/** Requirement templates before the list arrives. */
export default function TemplatesSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const columns = layout === 'desktop' ? 'lg:grid-cols-3 sm:grid-cols-2'
    : layout === 'tablet' ? 'sm:grid-cols-2' : 'grid-cols-1';

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading requirement templates</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-12" />
          <Block className="h-7 w-64 mt-2 max-w-full" />
          <Block className="h-4 w-80 mt-2 max-w-full" />
        </div>
        <Block className="h-11 w-36" />
      </div>

      <Block className="h-3 w-24 mb-2" />
      <div className={`grid grid-cols-1 ${columns} gap-3 items-start`}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <div className="px-4 py-3 border-b border-spc-line">
              <Block className="h-4 w-40 max-w-full" />
            </div>
            <div className="p-4">
              <Block className="h-3 w-full" />
              <Block className="h-3 w-2/3 mt-1.5" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                {Array.from({ length: 2 }, (_, j) => (
                  <div key={j}>
                    <Block className="h-3 w-16" />
                    <Block className="h-4 w-12 mt-1.5" />
                  </div>
                ))}
              </div>
              <Block className="h-3 w-20 mt-3" />
              <Block className="h-4 w-full mt-1.5" />
              <div className="flex gap-1.5 mt-3">
                <Block className="h-5 w-16" />
                <Block className="h-5 w-16" />
                <Block className="h-5 w-20" />
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-spc-line">
              <Block className="h-11 flex-1" />
              <Block className="h-11 flex-1" />
              <Block className="h-11 w-11" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
