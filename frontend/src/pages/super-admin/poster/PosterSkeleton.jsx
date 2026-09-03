/**
 * Placement Poster before the college list lands.
 *
 * Stands in for the picker and the generate button only. The figures below them
 * do not exist until a college is chosen, so reserving space for them would
 * promise something that is not coming.
 */
export default function PosterSkeleton({ layout = 'desktop' }) {
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the placement poster page</span>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <Block className="h-3 w-16" />
          <Block className="h-7 w-52 mt-2" />
          <Block className="h-4 w-64 mt-2 max-w-full" />
        </div>
        <Block className="h-11 w-40" />
      </div>

      <Block className="h-3 w-28 mb-2" />
      <Block className="h-3 w-20 mb-1.5" />
      <Block className="h-11 w-full mb-5" />

      <Block className="h-11 w-full" />
    </div>
  );
}
