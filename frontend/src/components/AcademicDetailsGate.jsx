import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../services/api';
import PromptShell from './student/PromptShell';

/**
 * Blocking gate for male applicants of a job named in ACADEMIC_GATE_JOBS who
 * have not yet given their 10th board + passing year.
 *
 * The data lives on the student's extended profile (sslc_board, sslc_year).
 * A student who already filled both is never gated; one who filled some sees
 * them pre-filled. 12th board and year are collected in the same form but are
 * optional — some students came through a diploma and never sat 12th.
 *
 * The form is here rather than behind a redirect because the fields belong to
 * the profile but the requirement belongs to the job — and the student must
 * not lose the portal over it.
 *
 * The server decides who is gated, and the wall is opt-in per job via the
 * ACADEMIC_GATE_JOBS env var. With that unset — the default — this renders
 * nothing for anybody, which is what makes it safe to ship ahead of the
 * decision to use it.
 *
 * Fails open, like CustomAnswersGate: if the status cannot be read, nothing
 * blocks. An open correction outranks this gate, so it yields to CorrectionGate
 * rather than stacking a second wall.
 */
export default function AcademicDetailsGate() {
  const location = useLocation();
  const [gate, setGate] = useState(null);
  const [form, setForm] = useState({
    sslc_board: '',
    sslc_year: '',
    twelfth_board: '',
    twelfth_year: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    studentAPI
      .getAcademicGateStatus()
      .then(async (res) => {
        const status = res.data?.data;
        if (!active || !status?.gate_active) {
          if (active) setGate(null);
          return;
        }
        // An open correction outranks this. The officer asked for that one and
        // it locks the portal to the Profile page, so raising a second wall on
        // top of it would stack two dialogs and leave the student unable to
        // satisfy either.
        try {
          const correction = await studentAPI.getCorrectionStatus();
          if (correction.data?.data?.correction_requested) {
            if (active) setGate(null);
            return;
          }
        } catch {
          // Unreadable correction status is not a reason to skip this gate.
        }
        if (active) {
          setGate(status);
          setForm({
            sslc_board: status.prefill?.sslc_board ?? '',
            sslc_year: status.prefill?.sslc_year ?? '',
            twelfth_board: status.prefill?.twelfth_board ?? '',
            twelfth_year: status.prefill?.twelfth_year ?? '',
          });
        }
      })
      .catch(() => { if (active) setGate(null); }); // fail open
    return () => { active = false; };
  }, [location.pathname]);

  if (!gate) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Only 10th board and year are required — some students (e.g. diploma holders)
  // never sat 12th, so the twelfth_* fields are optional.
  const missing = ['sslc_board', 'sslc_year'].filter(
    (field) => String(form[field] ?? '').trim() === ''
  );

  const handleSubmit = async () => {
    if (missing.length > 0) {
      toast.error('Please fill both 10th board and passing year to continue');
      return;
    }
    setSaving(true);
    try {
      await studentAPI.updateAcademicExtended(form);
      toast.success('Your 10th and 12th details have been saved');
      setGate(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm ' +
    'border border-spc-control outline-none transition-colors focus:border-spc-teal ' +
    'focus:ring-2 focus:ring-spc-teal/25';

  return (
    <PromptShell
      labelledBy="academic-gate-title"
      title={`${gate.company_name} needs your 10th and 12th details`}
      eyebrow="Required to continue using the portal"
      icon={GraduationCap}
      tone="teal"
      dismissible={false}
      primary={{
        label: saving ? 'Saving…' : 'Save and continue',
        onClick: handleSubmit,
        disabled: saving || missing.length > 0,
      }}
      footNote="These details are saved to your profile and will not be asked again."
    >
      <p className="text-spc-sm text-spc-body leading-relaxed mb-4">
        You applied to <span className="font-bold text-spc-ink">{gate.job_title}</span>, and the
        company needs your 10th board and passing year to consider your application. The rest of
        the portal stays closed until they are provided. 12th details are optional &mdash; fill
        them in if you have them.
      </p>

      <div className="rounded-spc bg-spc-surface-2 p-5 mb-4">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-4">10th (SSLC) Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sslc_board" className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              10th Board <span className="text-spc-bad ml-1">*</span>
            </label>
            <input
              id="sslc_board"
              type="text"
              name="sslc_board"
              value={form.sslc_board}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. CBSE, State Board"
            />
          </div>
          <div>
            <label htmlFor="sslc_year" className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              10th Passing Year <span className="text-spc-bad ml-1">*</span>
            </label>
            <input
              id="sslc_year"
              type="number"
              name="sslc_year"
              value={form.sslc_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className={inputClass}
              placeholder="e.g. 2020"
            />
          </div>
        </div>
      </div>

      <div className="rounded-spc bg-spc-surface-2 p-5">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-4">12th Details</h3>
        <p className="text-spc-xs text-spc-muted mb-4">Optional &mdash; skip if you did not complete 12th</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="twelfth_board" className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              12th Board <span className="text-spc-muted ml-1 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="twelfth_board"
              type="text"
              name="twelfth_board"
              value={form.twelfth_board}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. CBSE, State Board"
            />
          </div>
          <div>
            <label htmlFor="twelfth_year" className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              12th Passing Year <span className="text-spc-muted ml-1 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="twelfth_year"
              type="number"
              name="twelfth_year"
              value={form.twelfth_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className={inputClass}
              placeholder="e.g. 2022"
            />
          </div>
        </div>
      </div>
    </PromptShell>
  );
}