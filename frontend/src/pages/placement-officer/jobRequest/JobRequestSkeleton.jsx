import { Bar, Panel } from '../../../components/officer/OfficerUI';

/** Per-device skeletons for Create Job Request. Officer-only, so the shared
 *  TablePageSkeleton (22 other pages) is left alone. */
function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className={size === 'sm' ? 'h-7 w-48' : 'h-9 w-64 max-w-full'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function Stats({ columns }) {
  const cols = columns === 1 ? 'grid-cols-1' : 'grid-cols-3';
  return (
    <div className={`grid ${cols} gap-px bg-spc-line border border-spc-line-strong
      rounded-spc-panel overflow-hidden mb-5`}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-spc-surface p-4 min-h-[92px]">
          <Bar className="h-3 w-24 mb-6" />
          <Bar className="h-7 w-12 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function Rows() {
  return (
    <Panel>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <Bar className="h-4 w-48 max-w-full mb-2" />
          <Bar className="h-3 w-32" />
        </div>
      ))}
    </Panel>
  );
}

export function DesktopJobRequestSkeleton() {
  return <div><Heading /><Stats columns={3} /><Rows /></div>;
}
export function TabletJobRequestSkeleton() {
  return <div><Heading /><Stats columns={3} /><Rows /></div>;
}
export function MobileJobRequestSkeleton() {
  return <div><Heading size="sm" /><Stats columns={1} /><Rows /></div>;
}
