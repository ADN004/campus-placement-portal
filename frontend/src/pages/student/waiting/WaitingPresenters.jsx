import { motion } from 'framer-motion';
import {
  KasavuPanel,
  TimelineVertical,
  TimelineHorizontal,
  DetailGrid,
  RefreshButton,
  ReassuranceNote,
} from './waitingShared';

/**
 * The three device presenters for the pending-approval screen.
 *
 *   phone   : teal band, then a vertical timeline — three steps side by side
 *             would be unreadable at 360px
 *   tablet  : teal band, horizontal timeline, details two across
 *   desktop : full split — teal identity column beside the status column, which
 *             is what the width is actually for
 */

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function MobileWaiting({ name, prn, email, profile, refreshing, onRefresh }) {
  return (
    <div className="py-2">
      <motion.div {...fade} transition={{ duration: 0.34 }}>
        <KasavuPanel name={name} prn={prn} orientation="band" />
      </motion.div>

      <motion.div {...fade} transition={{ duration: 0.34, delay: 0.06 }} className="mt-5">
        <h1 className="text-spc-display font-extrabold text-spc-ink">
          Your registration is being reviewed
        </h1>
        <p className="text-spc-sm text-spc-muted mt-2">
          You&apos;ll have full access as soon as your placement officer approves it.
        </p>
      </motion.div>

      <motion.section
        {...fade}
        transition={{ duration: 0.34, delay: 0.12 }}
        className="mt-6 rounded-spc bg-spc-surface border border-spc-line p-5"
      >
        <TimelineVertical />
      </motion.section>

      <motion.section
        {...fade}
        transition={{ duration: 0.34, delay: 0.18 }}
        className="mt-4 rounded-spc bg-spc-surface border border-spc-line p-5"
      >
        <DetailGrid profile={profile} email={email} cols={1} />
      </motion.section>

      <motion.div {...fade} transition={{ duration: 0.34, delay: 0.24 }} className="mt-5 space-y-4">
        <RefreshButton refreshing={refreshing} onRefresh={onRefresh} full />
        <ReassuranceNote />
      </motion.div>
    </div>
  );
}

export function TabletWaiting({ name, prn, email, profile, refreshing, onRefresh }) {
  return (
    <div className="py-2">
      <motion.div {...fade} transition={{ duration: 0.38 }}>
        <KasavuPanel name={name} prn={prn} orientation="band" />
      </motion.div>

      <motion.div {...fade} transition={{ duration: 0.38, delay: 0.06 }} className="mt-7">
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink max-w-[20ch]">
          Your registration is being reviewed
        </h1>
        <p className="text-spc-body text-spc-muted mt-2.5 max-w-[56ch]">
          You&apos;ll have full access to job openings as soon as your placement officer
          approves it.
        </p>
      </motion.div>

      <motion.section
        {...fade}
        transition={{ duration: 0.38, delay: 0.12 }}
        className="mt-7 rounded-spc bg-spc-surface border border-spc-line p-6"
      >
        <TimelineHorizontal />
      </motion.section>

      <motion.section
        {...fade}
        transition={{ duration: 0.38, delay: 0.18 }}
        className="mt-4 rounded-spc bg-spc-surface border border-spc-line p-6"
      >
        <DetailGrid profile={profile} email={email} cols={2} />
        <div className="flex items-center justify-between gap-6 mt-6 pt-5 border-t border-spc-line">
          <ReassuranceNote />
          <div className="flex-shrink-0">
            <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export function DesktopWaiting({ name, prn, email, profile, refreshing, onRefresh }) {
  return (
    <div className="py-2">
      <div className="grid grid-cols-5 gap-6 items-stretch">
        <motion.div {...fade} transition={{ duration: 0.4 }} className="col-span-2">
          <KasavuPanel name={name} prn={prn} orientation="side" />
        </motion.div>

        <div className="col-span-3 flex flex-col gap-5">
          <motion.div {...fade} transition={{ duration: 0.4, delay: 0.08 }}>
            <h1 className="text-spc-display-lg font-extrabold text-spc-ink max-w-[18ch]">
              Your registration is being reviewed
            </h1>
            <p className="text-spc-body text-spc-muted mt-3 max-w-[56ch]">
              You&apos;ll have full access to job openings, applications and your resume as
              soon as your placement officer approves it.
            </p>
          </motion.div>

          <motion.section
            {...fade}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="rounded-spc bg-spc-surface border border-spc-line p-6"
          >
            <TimelineHorizontal />
          </motion.section>

          <motion.section
            {...fade}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-spc bg-spc-surface border border-spc-line p-6"
          >
            <DetailGrid profile={profile} email={email} cols={2} />
            <div className="flex items-center justify-between gap-6 mt-6 pt-5 border-t border-spc-line">
              <ReassuranceNote />
              <div className="flex-shrink-0">
                <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
