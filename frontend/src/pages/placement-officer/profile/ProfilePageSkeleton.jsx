import { Bar, Panel } from '../../../components/officer/OfficerUI';

/** Per-device skeletons for the officer Profile. Officer-only, so the shared
 *  ProfileSkeleton (used by the other roles) stays untouched. */
function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className="h-3 w-40 mb-2" />
      <Bar className={size === 'sm' ? 'h-7 w-40' : 'h-9 w-52'} />
      <Bar className="h-4 w-56 max-w-full mt-3" />
    </div>
  );
}

function Rows({ count = 4 }) {
  return (
    <Panel>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <Bar className="h-3 w-24" />
          <Bar className="h-4 w-48 max-w-full mt-2" />
        </div>
      ))}
    </Panel>
  );
}

function Media() {
  return (
    <Panel>
      <div className="px-4 py-4 flex items-start gap-4">
        <Bar className="w-28 h-28 rounded-spc-control flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Bar className="h-11 w-32 rounded-spc-control" />
          <Bar className="h-3 w-40 mt-3" />
        </div>
      </div>
    </Panel>
  );
}

export const DesktopProfileSkeleton = () => (
  <div>
    <Heading />
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 items-start">
      <div className="space-y-5">
        <Rows count={2} />
        <Rows count={5} />
      </div>
      <div className="space-y-5">
        <Media />
        <Media />
      </div>
    </div>
  </div>
);

export const TabletProfileSkeleton = () => (
  <div>
    <Heading />
    <div className="space-y-5">
      <Rows count={2} />
      <Media />
      <Rows count={5} />
    </div>
  </div>
);

export const MobileProfileSkeleton = () => (
  <div>
    <Heading size="sm" />
    <div className="space-y-5">
      <Rows count={2} />
      <Media />
      <Rows count={4} />
    </div>
  </div>
);
