/**
 * The profile before its request lands. Same two-column shape at desktop, same
 * field heights, so nothing jumps when the real values arrive.
 */
export default function ProfileSkeleton({ layout = 'desktop' }) {
  const twoColumn = layout === 'desktop';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const Field = () => (
    <div>
      <Block className="h-3 w-24 mb-1.5" />
      <Block className="h-11 w-full" />
    </div>
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your profile</span>

      <div className="mb-5">
        <Block className="h-3 w-20" />
        <Block className="h-7 w-40 mt-2" />
        <Block className="h-4 w-64 mt-2 max-w-full" />
      </div>

      <div className={twoColumn ? 'grid grid-cols-3 gap-4 items-start' : 'space-y-4'}>
        <div className={twoColumn ? 'col-span-2' : ''}>
          <Block className="h-3 w-24 mb-2" />
          <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <div className="px-4 py-3 border-b border-spc-line">
              <Block className="h-4 w-48" />
            </div>
            <div className="p-4 space-y-4">
              <Field />
              <Field />
              <Field />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Block className="h-3 w-20 mb-2" />
            <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
              <Block className="h-4 w-28" />
              <Block className="h-3 w-full mt-2" />
              <Block className="h-11 w-full mt-3" />
            </div>
          </div>
          <div>
            <Block className="h-3 w-20 mb-2" />
            <div className="bg-spc-surface border border-spc-line-strong rounded-spc-admin">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-spc-line last:border-b-0">
                  <Block className="h-3 w-20" />
                  <Block className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
