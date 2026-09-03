/** Send Notification before the college list lands. */
export default function NotifySkeleton({ layout = 'desktop' }) {
  const twoColumn = layout === 'desktop';
  const Block = ({ className = '' }) => (
    <div className={`bg-spc-surface-2 rounded-spc-admin-sm animate-pulse ${className}`} />
  );
  const Field = ({ tall }) => (
    <div>
      <Block className="h-3 w-20 mb-1.5" />
      <Block className={tall ? 'h-28 w-full' : 'h-11 w-full'} />
    </div>
  );

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the notification form</span>

      <div className="mb-5">
        <Block className="h-3 w-28" />
        <Block className="h-7 w-56 mt-2" />
        <Block className="h-4 w-80 mt-2 max-w-full" />
      </div>

      <div className={twoColumn ? 'grid grid-cols-5 gap-4 items-start' : 'space-y-5'}>
        <div className={twoColumn ? 'col-span-3' : ''}>
          <Block className="h-3 w-24 mb-2" />
          <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin space-y-4">
            <Field />
            <Field tall />
            <div>
              <Block className="h-3 w-16 mb-1.5" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: 3 }, (_, i) => <Block key={i} className="h-16 w-full" />)}
              </div>
            </div>
          </div>
          <Block className="h-20 w-full mt-4" />
          <Block className="h-11 w-full mt-3" />
        </div>

        <div className={twoColumn ? 'col-span-2 space-y-4' : 'space-y-4'}>
          <Block className="h-3 w-28 mb-2" />
          {Array.from({ length: 2 }, (_, panel) => (
            <div key={panel} className="bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-spc-line">
                <Block className="h-4 w-32" />
                <Block className="h-11 w-24" />
              </div>
              {Array.from({ length: 6 }, (_, row) => (
                <div key={row} className="flex items-center gap-3 px-4 py-2.5 border-b border-spc-line last:border-b-0">
                  <Block className="w-5 h-5 flex-shrink-0" />
                  <Block className="h-4 flex-1" />
                  <Block className="h-3 w-8 flex-shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
