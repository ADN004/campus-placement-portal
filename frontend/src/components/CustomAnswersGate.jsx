import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../services/api';
import PromptShell from './student/PromptShell';
import { CustomFieldInput } from './student/apply/applyShared';

/**
 * Blocking gate for a job whose owed answers a company is still waiting on.
 *
 * The dashboard prompt beside this one is a nudge and stays one: the answers
 * were lost by us, and a student who applied in good faith should not lose the
 * portal over our mistake. But a drive can close with a company still short of
 * data it needs to shortlist anyone, and at that point asking politely once a
 * visit stops being enough.
 *
 * So the wall is opt-in per job, and the server decides: an entry arrives with
 * `blocking: true` only when its job is named in BLOCKING_CUSTOM_ANSWER_JOBS.
 * With that unset — the default — this renders nothing for anybody, which is
 * what makes it safe to ship ahead of the decision to use it.
 *
 * The form is here rather than behind a redirect because there is nowhere to
 * redirect to: these questions belong to an application, not to the profile.
 * Answering clears the gate on the spot.
 *
 * Fails open, like CorrectionGate: if the list cannot be read, nothing blocks.
 */
export default function CustomAnswersGate() {
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    studentAPI
      .getPendingCustomAnswers()
      .then(async (res) => {
        const owed = (res.data?.data || []).filter((entry) => entry.blocking);
        if (!active || owed.length === 0) {
          if (active) setJob(null);
          return;
        }
        /*
         * An open correction outranks this. The officer asked for that one and
         * it locks the portal to the Profile page, so raising a second wall on
         * top of it would stack two dialogs and leave the student unable to
         * satisfy either. Only checked once something is actually blocking, so
         * students who owe nothing pay for no extra request.
         */
        try {
          const status = await studentAPI.getCorrectionStatus();
          if (status.data?.data?.correction_requested) {
            if (active) setJob(null);
            return;
          }
        } catch {
          // Unreadable correction status is not a reason to skip this gate.
        }
        if (active) setJob(owed[0]);
      })
      .catch(() => { if (active) setJob(null); }); // fail open
    return () => { active = false; };
  }, [location.pathname]);

  if (!job) return null;

  const fields = job.custom_fields || [];
  const handleChange = (fieldName, value) =>
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));

  // Mirrors the server's own rule, so the student is told before the round trip
  // rather than after it. Only `required` fields count: this job leaves 12th
  // Maths optional, and demanding it would wall in every student who came up
  // through a diploma and never sat one.
  const missing = fields.filter(
    (f) => f.required && String(answers[f.field_name] ?? '').trim() === ''
  );

  const handleSubmit = async () => {
    if (missing.length > 0) {
      toast.error(`Please answer: ${missing.map((f) => f.field_label || f.field_name).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const response = await studentAPI.saveCustomAnswers(job.job_id, answers);
      toast.success(response.data.message || 'Your answers have been recorded');
      setJob(null);
      setAnswers({});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save your answers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PromptShell
      labelledBy="custom-answers-gate-title"
      title={`${job.company_name} is still waiting on your answers`}
      eyebrow="About an application you have already made"
      icon={ClipboardList}
      tone="bad"
      dismissible={false}
      primary={{
        label: saving ? 'Saving…' : 'Submit answers',
        onClick: handleSubmit,
        disabled: saving || missing.length > 0,
      }}
      footNote="Your application still stands. These answers were not saved when you applied, so we are asking once more."
    >
      <p className="text-spc-sm text-spc-body leading-relaxed mb-4">
        You applied to <span className="font-bold text-spc-ink">{job.job_title}</span>, and these
        questions did not reach us the first time. The company cannot consider you without them,
        so the rest of the portal stays closed until they are answered.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.field_name}>
            <label
              htmlFor={field.field_name}
              className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5"
            >
              {field.field_label || field.field_name}
              {field.required
                ? <span className="text-spc-bad ml-1">*</span>
                : <span className="text-spc-muted ml-1 font-normal normal-case">(optional)</span>}
            </label>
            <CustomFieldInput
              field={field}
              value={answers[field.field_name] || ''}
              onChange={handleChange}
            />
          </div>
        ))}
      </div>
    </PromptShell>
  );
}
