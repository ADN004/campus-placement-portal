import { Bar, Panel } from '../../../components/officer/OfficerUI';

/** Per-device skeletons for Send Notification. Officer-only, so the shared
 *  FormPageSkeleton (used elsewhere) stays untouched. */
function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className={size === 'sm' ? 'h-7 w-48' : 'h-9 w-64'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function Compose({ stacked = false }) {
  return (
    <Panel>
      <div className="p-5">
        <Bar className="h-4 w-28 mb-4" />
        <Bar className="h-11 rounded-spc-control mb-4" />
        <Bar className="h-32 rounded-spc-control mb-6" />
        <Bar className="h-4 w-36 mb-3" />
        <div className={stacked ? 'space-y-2 mb-5' : 'grid grid-cols-3 gap-2 mb-5'}>
          {[...Array(3)].map((_, i) => (
            <Bar key={i} className="h-20 rounded-spc-control" />
          ))}
        </div>
        <Bar className="h-40 rounded-spc-control mb-5" />
        <Bar className="h-11 w-48 rounded-spc-control" />
      </div>
    </Panel>
  );
}

function History({ count = 4 }) {
  return (
    <Panel>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-3.5 w-40 max-w-full" />
            <Bar className="h-3 w-14" />
          </div>
          <Bar className="h-3 w-full mt-2" />
          <Bar className="h-3 w-24 mt-2" />
        </div>
      ))}
    </Panel>
  );
}

export const DesktopNotifySkeleton = () => (
  <div>
    <Heading />
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
      <Compose />
      <History />
    </div>
  </div>
);

export const TabletNotifySkeleton = () => (
  <div>
    <Heading />
    <Compose />
    <div className="mt-5">
      <History count={3} />
    </div>
  </div>
);

export const MobileNotifySkeleton = () => (
  <div>
    <Heading size="sm" />
    <Compose stacked />
    <div className="mt-5">
      <History count={2} />
    </div>
  </div>
);
