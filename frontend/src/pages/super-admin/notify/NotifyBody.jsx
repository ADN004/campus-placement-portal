import { Send } from 'lucide-react';
import useFormKeyboard from '../../../hooks/useFormKeyboard';
import { PageHeading, SectionLabel, PrimaryButton } from '../../../components/admin/AdminUI';
import {
  ComposeFields, AudienceSummary, CollegePicker, BranchPicker, SentThisSession,
  RecipientChoice, ConfirmSend, describeAudience,
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
  const toOfficers = p.formData.recipient_type === 'officers';

  // Enter walks the fields; the last one submits.
  const onKeyDown = useFormKeyboard({ onSubmit: p.onSubmit });

  return (
    <>
      <form onSubmit={p.onSubmit} onKeyDown={onKeyDown}>
        <PageHeading
          eyebrow="Communication"
          title="Send Notification"
          subline={toOfficers
            ? 'Reaches placement officers in their inbox, and by email at Urgent'
            : 'Reaches students in their portal, and by email at Urgent'}
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
                recipient={p.formData.recipient_type}
              />
            </div>

            <PrimaryButton type="submit" disabled={p.sending} className="w-full mt-3">
              <Send size={15} aria-hidden="true" />
              {p.sending
                ? 'Sending…'
                : `Send to ${describeAudience(p.targetCount, p.formData.recipient_type)}`}
            </PrimaryButton>
          </section>

          <section className={twoColumn ? 'col-span-2 space-y-4' : 'space-y-4'}>
            <SectionLabel>Who it reaches</SectionLabel>

            {/* First, because it is the choice the other two narrow. */}
            <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
              <RecipientChoice
                value={p.formData.recipient_type}
                onChange={p.onRecipientChange}
                disabled={p.sending}
                counts={p.recipientCounts}
              />
            </div>

            <CollegePicker
              colleges={p.colleges}
              selected={p.formData.target_colleges}
              onToggle={p.onCollegeToggle}
              onSelectAll={p.onSelectAllColleges}
              disabled={p.sending}
              recipient={p.formData.recipient_type}
            />

            {/* An officer has no branch, so the picker goes rather than sitting
                there disabled. Whatever was narrowed is kept in form state and
                comes back if the audience switches back to students. */}
            {!toOfficers && (
              <BranchPicker
                branches={p.branches}
                selected={p.formData.target_branches}
                onToggle={p.onBranchToggle}
                onSelectAll={p.onSelectAllBranches}
                disabled={p.sending}
              />
            )}
          </section>
        </div>

        <SentThisSession items={p.recentNotifications} />
      </form>

      {/* Outside the form on purpose: a button inside one submits it, and this
          dialog's buttons must not re-open the dialog they sit in. */}
      {p.confirmOpen && (
        <ConfirmSend
          recipient={p.formData.recipient_type}
          count={p.targetCount}
          otherCount={p.otherCount}
          colleges={p.formData.target_colleges.length}
          branches={p.branchCount}
          priority={p.formData.priority}
          sending={p.sending}
          onConfirm={p.onConfirmSend}
          onSwitch={p.onSwitchRecipient}
          onClose={p.onCancelSend}
        />
      )}
    </>
  );
}
