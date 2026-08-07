import { Bar, Panel } from '../../../components/officer/OfficerUI';

/** Per-device skeletons for PRN Ranges. Officer-only, so the shared
 *  TablePageSkeleton (22 other pages) stays untouched. */
function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className={size === 'sm' ? 'h-7 w-40' : 'h-9 w-56'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function Rows() {
  return (
    <Panel>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-4 w-44 max-w-full" />
            <Bar className="h-3.5 w-20" />
          </div>
          <Bar className="h-3 w-36 mt-2" />
        </div>
      ))}
    </Panel>
  );
}

const Body = ({ size }) => (
  <div>
    <Heading size={size} />
    <Bar className="h-28 rounded-spc-panel mb-5" />
    <Bar className="h-11 w-64 max-w-full rounded-spc-control mb-4" />
    <Rows />
  </div>
);

export const DesktopPrnRangesSkeleton = () => <Body />;
export const TabletPrnRangesSkeleton = () => <Body />;
export const MobilePrnRangesSkeleton = () => <Body size="sm" />;
