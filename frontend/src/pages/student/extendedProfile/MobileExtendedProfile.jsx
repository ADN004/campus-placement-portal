import { motion } from 'framer-motion';
import { CompletionBar, SectionButton, SectionContent } from './extendedProfileShared';

/**
 * Mobile (below `md`) presenter.
 *
 * Completion is a bar rather than a ring — a 128px ring costs a third of a
 * phone screen to say one number. The six sections sit in a compact 2×3 grid of
 * tiles above the form, so switching between them never leaves the page and no
 * back-and-forth navigation is needed to fill them in sequence.
 */
export default function MobileExtendedProfile({ completion, sections, activeSection, onSelectSection, getSectionCompletion, getSectionStatus, ...rest }) {
  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="mb-4"
      >
        <h1 className="text-spc-display font-extrabold text-spc-ink">Extended profile</h1>
        <p className="text-spc-sm text-spc-muted mt-1">
          Needed for jobs that ask for more than the basics.
        </p>
      </motion.header>

      <div className="mb-5">
        <CompletionBar percent={completion.overall_completion} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {sections.map((section) => (
          <SectionButton
            key={section.id}
            section={section}
            variant="tile"
            active={activeSection === section.id}
            percent={getSectionCompletion(section.id)}
            complete={getSectionStatus(section.id)}
            onSelect={onSelectSection}
          />
        ))}
      </div>

      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
        className="rounded-spc bg-spc-surface border border-spc-line p-4"
      >
        <SectionContent
          activeSection={activeSection}
          getSectionStatus={getSectionStatus}
          {...rest}
        />
      </motion.div>
    </div>
  );
}

/** Loading skeleton shaped like the mobile extended profile. */
export function MobileExtendedProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-56 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-64 bg-spc-surface-2 rounded animate-pulse mb-5" />
      <div className="h-24 w-full bg-spc-surface-2 rounded-spc animate-pulse mb-5" />
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[76px] bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>
      <div className="rounded-spc border border-spc-line bg-spc-surface p-4 space-y-4">
        <div className="h-6 w-44 bg-spc-surface-2 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-3 w-24 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
