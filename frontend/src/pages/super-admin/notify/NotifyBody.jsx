import { Send } from 'lucide-react';
import { PageHeading, SectionLabel, PrimaryButton } from '../../../components/admin/AdminUI';
import {
  ComposeFields, AudienceSummary, CollegePicker, BranchPicker, SentThisSession,
} from './notifyShared';

/**
 * Send Notification, at every width.
 *
 * Desktop puts the message beside the audience, because choosing who it reaches
 * is half the task and scrolling between the two loses the thread. Below `lg`
 * they stack, message first — you write it, then decide who gets it.
 */
export default function NotifyBody(p) {
  const { layout } = p;
  const twoColumn = layout === 'desktop';

  return (
    <form onSubmit={p.onSubmit}>
      <PageHeading
        eyebrow="Communication"
        title="Send Notification"
        subline="Reaches students in their portal, and by email at Urgent"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <div className={twoColumn ? 'grid grid-cols-5 gap-4 items-start' : 'space-y-5'}>
        <section className={twoColumn ? 'col-span-3' : ''}>
          <SectionLabel>The message</SectionLabel>
          <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
            <ComposeFields formData={p.formData} onChange={p.onChange} disabled={p.sending} />
          </div>

          <div className="mt-4">
            <AudienceSummary
              count={p.targetCount}
              colleges={p.formData.target_colleges.length}
              branches={p.branchCount}
            />
          </div>

          <PrimaryButton type="submit" disabled={p.sending} className="w-full mt-3">
            <Send size={15} aria-hidden="true" />
            {p.sending ? 'Sending…' : `Send to ${p.targetCount} ${p.targetCount === 1 ? 'student' : 'students'}`}
          </PrimaryButton>
        </section>

        <section className={twoColumn ? 'col-span-2 space-y-4' : 'space-y-4'}>
          <SectionLabel>Who it reaches</SectionLabel>
          <CollegePicker
            colleges={p.colleges}
            selected={p.formData.target_colleges}
            onToggle={p.onCollegeToggle}
            onSelectAll={p.onSelectAllColleges}
            disabled={p.sending}
          />
          <BranchPicker
            branches={p.branches}
            selected={p.formData.target_branches}
            onToggle={p.onBranchToggle}
            onSelectAll={p.onSelectAllBranches}
            disabled={p.sending}
          />
        </section>
      </div>

      <SentThisSession items={p.recentNotifications} />
    </form>
  );
}
