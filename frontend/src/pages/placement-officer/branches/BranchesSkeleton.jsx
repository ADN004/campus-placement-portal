import { Bar, Panel } from '../../../components/officer/OfficerUI';

/** Per-device skeletons for College Branches. Officer-only, so the shared
 *  TablePageSkeleton (22 other pages) stays untouched. */
function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className="h-3 w-32 mb-2" />
      <Bar className={size === 'sm' ? 'h-7 w-48' : 'h-9 w-64'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function Rows({ count = 6 }) {
  return (
    <Panel>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 px-4 py-3
            border-b border-spc-line last:border-b-0"
        >
          <Bar className="h-4 w-52 max-w-full" />
          <Bar className="h-3.5 w-16" />
        </div>
      ))}
    </Panel>
  );
}

const Counts = () => <Bar className="h-20 rounded-spc-panel mb-5" />;

export const DesktopBranchesSkeleton = () => (
  <div>
    <Heading />
    <Counts />
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
      <Rows />
      <Rows count={4} />
    </div>
  </div>
);

export const TabletBranchesSkeleton = () => (
  <div>
    <Heading />
    <Counts />
    <Rows />
  </div>
);

export const MobileBranchesSkeleton = () => (
  <div>
    <Heading size="sm" />
    <Counts />
    <Rows count={5} />
  </div>
);
