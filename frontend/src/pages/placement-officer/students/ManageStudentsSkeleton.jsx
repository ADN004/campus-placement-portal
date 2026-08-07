import { Panel } from './studentsShared';

/**
 * Loading skeletons for ManageStudents, one per device.
 *
 * The page previously used the shared `TablePageSkeleton`, which is imported by
 * 22 other pages including 16 super-admin ones — restyling it in place would
 * have changed a role that has not been redesigned. These are officer-only and
 * shaped like the layout that actually follows them.
 */

function Bar({ className = '' }) {
  return <div className={`bg-spc-surface-2 animate-pulse rounded-spc-badge ${className}`} />;
}

function Heading({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className={size === 'sm' ? 'h-7 w-52' : 'h-9 w-72 max-w-full'} />
      <Bar className="h-4 w-80 max-w-full mt-3" />
    </div>
  );
}

function Tabs() {
  return (
    <div className="flex gap-px bg-spc-line border border-spc-line-strong rounded-spc-panel overflow-hidden mb-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-1 min-h-[52px] bg-spc-surface flex flex-col items-center justify-center gap-1">
          <Bar className="h-3 w-14" />
          <Bar className="h-3 w-6" />
        </div>
      ))}
    </div>
  );
}

/** Rows shaped like the desktop table. */
function TableRows({ columns }) {
  return (
    <Panel>
      <div className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural px-3 py-2 flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>
      {[...Array(10)].map((_, r) => (
        <div key={r} className="px-3 py-3 border-b border-spc-line last:border-b-0 flex gap-4 items-center">
          {[...Array(columns)].map((_, i) => (
            <Bar key={i} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </Panel>
  );
}

/** Rows shaped like the phone/tablet ruled list. */
function ListRows({ lines }) {
  return (
    <Panel>
      {[...Array(8)].map((_, r) => (
        <div key={r} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-3.5 w-20" />
          </div>
          <Bar className="h-4 w-44 max-w-full mt-2" />
          {lines > 2 && <Bar className="h-3 w-36 mt-2" />}
        </div>
      ))}
    </Panel>
  );
}

export function DesktopManageStudentsSkeleton() {
  return (
    <div>
      <Heading />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Bar className="h-16 rounded-spc-panel" />
        <Bar className="h-16 rounded-spc-panel" />
      </div>
      <Tabs />
      <div className="flex gap-3 mb-4">
        <Bar className="h-11 flex-1 rounded-spc-control" />
        <Bar className="h-11 w-28 rounded-spc-control" />
        <Bar className="h-11 w-44 rounded-spc-control" />
      </div>
      <TableRows columns={8} />
    </div>
  );
}

export function TabletManageStudentsSkeleton() {
  return (
    <div>
      <Heading />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Bar className="h-14 rounded-spc-panel" />
        <Bar className="h-14 rounded-spc-panel" />
      </div>
      <Tabs />
      <div className="flex gap-3 mb-4">
        <Bar className="h-11 flex-1 rounded-spc-control" />
        <Bar className="h-11 w-28 rounded-spc-control" />
      </div>
      <ListRows lines={3} />
    </div>
  );
}

export function MobileManageStudentsSkeleton() {
  return (
    <div>
      <Heading size="sm" />
      <div className="flex gap-2 mb-4">
        <Bar className="h-11 w-28 rounded-spc-control" />
        <Bar className="h-11 w-24 rounded-spc-control" />
      </div>
      <div className="space-y-3 mb-4">
        <Bar className="h-14 rounded-spc-panel" />
        <Bar className="h-14 rounded-spc-panel" />
      </div>
      <Tabs />
      <Bar className="h-11 w-full rounded-spc-control mb-3" />
      <ListRows lines={3} />
    </div>
  );
}
