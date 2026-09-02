import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import PromptShell from './PromptShell';
import { CustomFieldInput } from './apply/applyShared';
import { studentAPI } from '../../services/api';

/**
 * The questions a company asked, being asked a second time.
 *
 * When these jobs were applied to, the answers a student typed were lost on
 * submission — the app sent them under one name and the server read another —
 * so the applications went through with nothing recorded. Nothing can recover
 * what was typed, so the only honest fix is to ask again.
 *
 * Deliberately not a gate. The student has already applied and done nothing
 * wrong; blocking the portal over a mistake of ours would be the wrong trade.
 * It is also not dismissed permanently: there is no `localStorage` key here on
 * purpose, so "Not now" defers to the next visit rather than for ever. The
 * company genuinely needs these answers.
 *
 * `job` is one entry from `GET /students/jobs/pending-custom-answers`.
 */
export default function CustomAnswersPrompt({ job, onDone, onDismiss }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const fields = job.custom_fields || [];
  const handleChange = (fieldName, value) =>
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));

  // Mirrors the server's own rule, so the student is told before the round trip
  // rather than after it.
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
      onDone();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save your answers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PromptShell
      onClose={onDismiss}
      labelledBy="custom-answers-title"
      title={`${job.company_name} needs a few answers`}
      eyebrow="About an application you have already made"
      icon={ClipboardList}
      primary={{
        label: saving ? 'Saving…' : 'Submit answers',
        onClick: handleSubmit,
        disabled: saving || missing.length > 0,
      }}
      secondary={{ label: 'Not now', onClick: onDismiss, disabled: saving }}
      footNote="Your application still stands. These answers were not saved when you applied, so we are asking once more."
    >
      <p className="text-spc-sm text-spc-body mb-4">
        You applied to <span className="font-bold text-spc-ink">{job.job_title}</span>. These
        questions did not reach us the first time, so please answer them again.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.field_name}>
            <label
              htmlFor={field.field_name}
              className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5"
            >
              {field.field_label || field.field_name}
              {field.required && <span className="text-spc-bad ml-1">*</span>}
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
