import { motion } from 'framer-motion';
import { ActionPanel, ResumeSections } from './resumeSections';

/**
 * The three device presenters for the resume builder.
 *
 * They share one section list — what differs is where the action panel lives,
 * which is the only part of this page that really wants a different shape per
 * device:
 *
 *   phone   : actions pinned to the bottom of the screen, in thumb reach
 *   tablet  : actions in a sticky strip above the sections
 *   desktop : actions in a sticky side column, with the missing-items checklist
 *             visible the whole time you scroll
 */

function Header({ size }) {
  const isPhone = size === 'sm';
  return (
    <motion.header
      initial={{ opacity: 0, y: isPhone ? 12 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isPhone ? 0.32 : 0.4 }}
      className={isPhone ? 'mb-4' : 'mb-6'}
    >
      <h1 className={`${isPhone ? 'text-spc-display' : 'text-spc-display-lg'} font-extrabold text-spc-ink`}>
        My resume
      </h1>
      <p className={`${isPhone ? 'text-spc-sm' : 'text-spc-body'} text-spc-muted mt-1.5`}>
        Build the resume employers receive with your application.
      </p>
    </motion.header>
  );
}

export function MobileResume({ actionProps, sectionProps }) {
  return (
    <div className="pb-32">
      <Header size="sm" />

      {/* The checklist of what's still missing stays inline; only the buttons
          move to the bottom bar. */}
      {!actionProps.canDownload && (
        <div className="mb-4">
          <ActionPanel {...actionProps} showActions={false} bare />
        </div>
      )}

      <ResumeSections {...sectionProps} />

      <div
        className="spc-above-tabbar fixed inset-x-0 z-20 px-4 pt-3 bg-spc-surface border-t border-spc-line"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <ActionPanel {...actionProps} stacked showChecklist={false} bare />
      </div>
    </div>
  );
}

export function TabletResume({ actionProps, sectionProps }) {
  return (
    <div>
      <Header size="lg" />
      <div className="sticky top-16 z-10 -mx-6 px-6 pt-2 pb-4 bg-spc-ground">
        <ActionPanel {...actionProps} />
      </div>
      <ResumeSections {...sectionProps} />
    </div>
  );
}

export function DesktopResume({ actionProps, sectionProps }) {
  return (
    <div>
      <Header size="lg" />
      <div className="grid grid-cols-3 gap-5 items-start">
        <div className="col-span-2">
          <ResumeSections {...sectionProps} />
        </div>
        <aside className="col-span-1 sticky top-20">
          <ActionPanel {...actionProps} stacked />
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- skeletons */

function SectionRows({ count }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-spc border border-spc-line bg-spc-surface h-[60px] flex items-center gap-3 px-4">
          <div className="h-8 w-8 rounded-spc-sm bg-spc-surface-2 animate-pulse" />
          <div className="h-4 w-44 bg-spc-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function MobileResumeSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-44 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-64 bg-spc-surface-2 rounded animate-pulse mb-5" />
      <SectionRows count={7} />
    </div>
  );
}

export function TabletResumeSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-10 w-64 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-72 bg-spc-surface-2 rounded animate-pulse mb-5" />
      <div className="h-20 w-full bg-spc-surface-2 rounded-spc animate-pulse mb-5" />
      <SectionRows count={8} />
    </div>
  );
}

export function DesktopResumeSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-11 w-72 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-80 bg-spc-surface-2 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-3 gap-5 items-start">
        <div className="col-span-2">
          <SectionRows count={9} />
        </div>
        <div className="col-span-1 rounded-spc border border-spc-line bg-spc-surface p-4 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
