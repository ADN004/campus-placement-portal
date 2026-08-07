import { Send, Users } from 'lucide-react';
import {
  PageHeading, Panel, SectionLabel, PrimaryButton, SecondaryButton,
  FieldLabel, FIELD_CLASS,
} from '../../../components/officer/OfficerUI';
import { FormSection, RequiredMark } from '../jobRequest/jobRequestShared';
import { PriorityChoice, BranchPicker, SentHistory } from './notifyShared';

/**
 * Send Notification.
 *
 * Compose on the left, what has already been sent on the right — because the
 * useful question before writing another one is what the last one said and
 * whether anybody opened it.
 *
 * The recipient count sits with the send button rather than in a strip above
 * it: it is the one number that decides whether pressing the button is safe, so
 * it goes where the thumb is.
 */
export default function NotifyPage({
  layout,
  form,
  branches,
  sending,
  sentItems,
  sentLoading,
  targetCount,
  onChange,
  onToggleBranch,
  onToggleAllBranches,
  onSubmit,
  onClear,
}) {
  const isDesktop = layout === 'desktop';
  const isMobile = layout === 'mobile';
  const canSend = Boolean(form.title.trim()) && Boolean(form.message.trim()) && targetCount > 0;

  const compose = (
    <Panel>
      <form onSubmit={onSubmit} className="p-4 sm:p-5">
        <FormSection title="The message">
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="notify-title">
                Title <RequiredMark />
              </FieldLabel>
              <input
                id="notify-title"
                type="text"
                className={FIELD_CLASS}
                value={form.title}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="e.g. Infosys drive — registration closes Friday"
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="notify-message">
                Message <RequiredMark />
              </FieldLabel>
              <textarea
                id="notify-message"
                rows={isMobile ? 5 : 7}
                className={`${FIELD_CLASS} py-2.5 h-auto leading-relaxed`}
                value={form.message}
                onChange={(e) => onChange('message', e.target.value)}
                placeholder="What do the students need to know, and by when?"
                required
              />
              <p className="text-xs text-spc-muted mt-1 tabular-nums">
                {form.message.length} characters
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Who receives it">
          <div className="space-y-5">
            <PriorityChoice
              value={form.priority}
              onChange={(value) => onChange('priority', value)}
              stacked={isMobile}
            />

            <div>
              <FieldLabel>Branches</FieldLabel>
              <p className="text-xs text-spc-muted -mt-1 mb-2">
                Choose none to send to every approved student in your college.
              </p>
              <BranchPicker
                branches={branches}
                selected={form.target_branches}
                onToggle={onToggleBranch}
                onToggleAll={onToggleAllBranches}
                columns={isMobile ? 1 : 2}
              />
            </div>
          </div>
        </FormSection>

        {/* The count and the button together: the number is what makes pressing
            the button safe or not, so it is not left in a strip further up. */}
        <div className="mt-5 pt-4 border-t-[1.5px] border-spc-rule-structural">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
            <p className="text-spc-sm text-spc-body">
              Sending to{' '}
              <span className="font-bold text-spc-ink tabular-nums">{targetCount}</span>{' '}
              student{targetCount === 1 ? '' : 's'}
              {form.priority === 'urgent' && targetCount > 0 && (
                <span className="text-spc-bad font-bold"> — and emailing all of them</span>
              )}
            </p>
          </div>

          <div className={isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
            <PrimaryButton
              type="submit"
              disabled={sending || !canSend}
              className={isMobile ? 'w-full' : undefined}
            >
              <Send size={15} aria-hidden="true" />
              <span>{sending ? 'Sending…' : 'Send notification'}</span>
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={onClear}
              disabled={sending}
              className={isMobile ? 'w-full' : undefined}
            >
              Clear
            </SecondaryButton>
          </div>
        </div>
      </form>
    </Panel>
  );

  const history = <SentHistory items={sentItems} loading={sentLoading} />;

  return (
    <div className={isMobile ? 'pb-2' : undefined}>
      <PageHeading
        title="Send Notification"
        subline="Tell students in your college about a drive, a deadline or a change"
        size={isMobile ? 'sm' : 'md'}
      />

      {isDesktop ? (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
          <section>
            <SectionLabel>Compose</SectionLabel>
            {compose}
          </section>
          <section>
            <SectionLabel>History</SectionLabel>
            {history}
          </section>
        </div>
      ) : (
        <>
          <section>{compose}</section>
          <section className="mt-5">{history}</section>
        </>
      )}
    </div>
  );
}
