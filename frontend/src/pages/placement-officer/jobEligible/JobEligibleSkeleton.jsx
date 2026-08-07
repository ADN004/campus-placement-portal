import { Bar, Panel } from '../../../components/officer/OfficerUI';

/**
 * Loading skeletons for JobEligibleStudents, one per device.
 *
 * Officer-only: the shared TablePageSkeleton this page used is imported by 22
 * other pages, 16 of them super-admin, so it must not be restyled in place.
 */

function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className={size === 'sm' ? 'h-7 w-52' : 'h-9 w-72 max-w-full'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function JobTiles({ columns }) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';
  return (
    <div
      className={`grid grid-cols-1 ${cols} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden mb-5`}
    >
      {[...Array(columns === 1 ? 3 : columns * 2)].map((_, i) => (
        <div key={i} className="bg-spc-surface p-4 min-h-[92px]">
          <Bar className="h-4 w-40 max-w-full mb-2" />
          <Bar className="h-3 w-28 mb-3" />
          <Bar className="h-3 w-36 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function Rows() {
  return (
    <Panel>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-3.5 w-20" />
          </div>
          <Bar className="h-4 w-44 max-w-full mt-2" />
          <Bar className="h-3 w-36 mt-2" />
        </div>
      ))}
    </Panel>
  );
}

export function DesktopJobEligibleSkeleton() {
  return (
    <div>
      <Heading />
      <Bar className="h-3 w-28 mb-2" />
      <JobTiles columns={3} />
      <Rows />
    </div>
  );
}

export function TabletJobEligibleSkeleton() {
  return (
    <div>
      <Heading />
      <Bar className="h-3 w-28 mb-2" />
      <JobTiles columns={2} />
      <Rows />
    </div>
  );
}

export function MobileJobEligibleSkeleton() {
  return (
    <div>
      <Heading size="sm" />
      <Bar className="h-3 w-28 mb-2" />
      <JobTiles columns={1} />
      <Rows />
    </div>
  );
}
