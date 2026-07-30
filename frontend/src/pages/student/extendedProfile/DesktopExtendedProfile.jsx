import { motion } from 'framer-motion';
import { CompletionRing, SectionButton, SectionContent } from './extendedProfileShared';

/**
 * Desktop (`lg` and up) presenter — sticky section rail on the left, form on
 * the right, keeping the one-third / two-thirds split this page has always had.
 * The rail sticks so section progress stays visible while a long form scrolls.
 */
export default function DesktopExtendedProfile({ completion, sections, activeSection, onSelectSection, getSectionCompletion, getSectionStatus, ...rest }) {
  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Extended profile</h1>
        <p className="text-spc-body text-spc-muted mt-2">
          Complete this to apply for jobs that require additional information.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="rounded-spc bg-spc-surface border border-spc-line p-6 mb-5 flex items-center justify-between gap-8"
      >
        <div className="min-w-0">
          <h2 className="text-spc-h1 font-bold text-spc-ink">Profile completion</h2>
          <p className="text-spc-body text-spc-muted mt-2">
            Fill at least one field in each section to complete your profile.
          </p>
          <p className="text-spc-xs text-spc-muted mt-1">
            The more you complete, the more accurately jobs are matched to you.
          </p>
        </div>
        <CompletionRing percent={completion.overall_completion} size={128} />
      </motion.div>

      <div className="grid grid-cols-3 gap-5 items-start">
        <motion.nav
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          aria-label="Profile sections"
          className="col-span-1 sticky top-20 space-y-2"
        >
          {sections.map((section) => (
            <SectionButton
              key={section.id}
              section={section}
              variant="row"
              active={activeSection === section.id}
              percent={getSectionCompletion(section.id)}
              complete={getSectionStatus(section.id)}
              onSelect={onSelectSection}
            />
          ))}
        </motion.nav>

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="col-span-2 rounded-spc bg-spc-surface border border-spc-line p-6"
        >
          <SectionContent activeSection={activeSection} getSectionStatus={getSectionStatus} {...rest} />
        </motion.div>
      </div>
    </div>
  );
}

/** Loading skeleton shaped like the desktop extended profile. */
export function DesktopExtendedProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-11 w-80 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-96 bg-spc-surface-2 rounded animate-pulse mb-6" />
      <div className="rounded-spc border border-spc-line bg-spc-surface p-6 mb-5 flex items-center justify-between">
        <div className="flex-1">
          <div className="h-7 w-56 bg-spc-surface-2 rounded animate-pulse mb-3" />
          <div className="h-4 w-80 bg-spc-surface-2 rounded animate-pulse" />
        </div>
        <div className="h-32 w-32 bg-spc-surface-2 rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-5 items-start">
        <div className="col-span-1 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
          ))}
        </div>
        <div className="col-span-2 rounded-spc border border-spc-line bg-spc-surface p-6 space-y-4">
          <div className="h-7 w-52 bg-spc-surface-2 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-spc-surface-2 rounded animate-pulse mb-2" />
                <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
