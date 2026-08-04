import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Edit,
  Save,
  X,
  AlertTriangle,
  Camera,
  CheckCircle2,
  GraduationCap,
  FileText,
  Users,
  User,
  Shield,
} from 'lucide-react';
import { BRANCH_SHORT_NAMES } from '../../../constants/branches';

/**
 * The sections of the student profile, shared by all three device presenters.
 *
 * These are shared on purpose. Which fields are editable depends on a tangle of
 * conditions — edit mode, an open correction request, a CGPA unlock window, a
 * backlog unlock window, registration status — and writing that out three times
 * would guarantee the devices drift apart on who can edit what. The presenters
 * decide arrangement and density; these decide content.
 *
 * Every input keeps its original `name` and `id`: the backend and the form
 * handlers rely on them.
 */

/* ------------------------------------------------------------- primitives */

export function SectionCard({ title, icon: Icon, children, tone = 'default', action }) {
  const toneClass =
    tone === 'warn'
      ? 'bg-spc-warn-bg border-transparent'
      : 'bg-spc-surface border-spc-line';
  return (
    <section className={`rounded-spc border p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2.5 text-spc-h2 font-bold text-spc-ink">
          {Icon && <Icon size={19} className="text-spc-teal flex-shrink-0" />}
          <span>{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, span = false }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Static value shown when a field isn't editable. */
export function Value({ children, muted = false }) {
  return (
    <p className={`text-spc-sm font-semibold break-words ${muted ? 'text-spc-muted' : 'text-spc-ink'}`}>
      {children}
    </p>
  );
}

const controlClass =
  `w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm
   border border-spc-control outline-none transition-colors
   focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25`;

/** Amber ring marks the registration fields a correction has temporarily opened. */
const correctionClass =
  `w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm
   border-2 border-spc-warn/50 outline-none transition-colors
   focus:border-spc-warn focus:ring-2 focus:ring-spc-warn/25`;

export function TextInput({ correction = false, ...props }) {
  return <input {...props} className={correction ? correctionClass : controlClass} />;
}

export function SelectInput({ correction = false, children, ...props }) {
  return (
    <select {...props} className={correction ? correctionClass : controlClass}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea {...props} className={`${controlClass} min-h-[92px]`} />;
}

/** Locked / unlock-window notice used by both Academic and Backlogs. */
function LockNotice({ locked, unlockEnd, subject }) {
  if (locked) {
    return (
      <div className="flex items-start gap-2 rounded-spc-sm bg-spc-warn-bg px-3.5 py-3 mb-4">
        <Lock size={15} className="text-spc-warn flex-shrink-0 mt-0.5" />
        <p className="text-spc-xs text-spc-body">
          {subject} fields are locked. Contact your placement officer to request an unlock window.
        </p>
      </div>
    );
  }
  if (unlockEnd) {
    return (
      <div className="flex items-start gap-2 rounded-spc-sm bg-spc-ok-bg px-3.5 py-3 mb-4">
        <Edit size={15} className="text-spc-ok flex-shrink-0 mt-0.5" />
        <p className="text-spc-xs text-spc-body">
          {subject} editing is open until{' '}
          {new Date(unlockEnd).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    );
  }
  return null;
}

/* ------------------------------------------------------- correction banner */

export function CorrectionBanner({
  profile,
  editMode,
  photoUploading,
  resolvingCorrection,
  onPhoto,
  onResolve,
}) {
  if (!profile?.correction_requested) return null;

  return (
    <section className="rounded-spc bg-spc-bad-bg overflow-hidden mb-6">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-spc-bad">
        <AlertTriangle className="text-white flex-shrink-0" size={20} />
        <h2 className="text-spc-h3 font-bold text-white">
          Your placement officer asked you to correct this
        </h2>
      </div>

      <div className="p-5">
        {profile.correction_note && (
          <div className="rounded-spc-sm bg-spc-surface p-4 text-spc-sm text-spc-ink font-medium mb-4">
            {profile.correction_note}
          </div>
        )}

        {profile.correction_photo_required ? (
          <div className="mb-4">
            <p className="text-spc-xs font-bold text-spc-bad mb-2">
              Your photo was removed — upload a clear new one to continue.
            </p>
            <label
              className={`inline-flex items-center gap-2 min-h-[48px] px-5 rounded-spc-sm
                text-spc-sm font-bold text-white cursor-pointer transition-opacity
                ${photoUploading ? 'bg-spc-muted cursor-wait' : 'bg-spc-bad hover:opacity-95'}`}
            >
              <Camera size={17} />
              {photoUploading ? 'Uploading…' : 'Upload new photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={photoUploading}
                onChange={onPhoto}
              />
            </label>
            <p className="text-xs text-spc-body mt-2">Max 500KB, JPG or PNG — same as registration.</p>
          </div>
        ) : (
          <p className="text-spc-xs text-spc-body mb-4">
            Fix what&apos;s noted above
            {editMode ? '' : <> — use <strong>Edit profile</strong> below to change any locked detail</>}
            , then confirm you&apos;re done.
          </p>
        )}

        <button
          type="button"
          onClick={onResolve}
          disabled={resolvingCorrection || profile.correction_photo_required}
          title={profile.correction_photo_required ? 'Upload your new photo first' : ''}
          className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-spc-sm
            bg-spc-ok text-white text-spc-sm font-bold hover:opacity-95 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={17} />
          {resolvingCorrection ? 'Saving…' : "I've made the corrections"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ edit actions */

export function EditActions({ editMode, saving, onEdit, onSave, onCancel, full = false }) {
  const width = full ? 'flex-1' : '';
  if (!editMode) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
          bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity ${width}`}
      >
        <Edit size={17} />
        <span>Edit profile</span>
      </button>
    );
  }
  return (
    <div className={`flex gap-2.5 ${full ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
          bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity
          disabled:opacity-50 disabled:cursor-not-allowed ${width}`}
      >
        <Save size={17} />
        <span>{saving ? 'Saving…' : 'Save'}</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
          bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-sm font-bold
          hover:bg-spc-surface-2 transition-colors disabled:opacity-50 ${width}`}
      >
        <X size={17} />
        <span>Cancel</span>
      </button>
    </div>
  );
}

/* --------------------------------------------------- registration details */

export function RegistrationDetails({ profile, formData, editMode, onChange, collegeBranches, userEmail, cols = 2 }) {
  // Registration identity is fixed once approved — a correction request is the
  // only thing that reopens it. Unchanged from before.
  const open = editMode && profile?.correction_requested;
  const grid = cols === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <SectionCard title={open ? 'Registration details' : 'Registration details'} icon={Lock} tone={open ? 'warn' : 'default'}>
      <p className="text-spc-xs text-spc-muted -mt-2 mb-4">
        {open
          ? 'Editable while your correction is open.'
          : 'Set at registration and cannot be changed here.'}
      </p>

      <div className={`grid ${grid} gap-4`}>
        <Field label="PRN number">
          <Value>{profile?.prn}</Value>
        </Field>

        <Field label="Full name">
          {open ? (
            <TextInput correction type="text" name="student_name" value={formData.student_name} onChange={onChange} />
          ) : (
            <Value>{profile?.student_name || 'Not set'}</Value>
          )}
        </Field>

        <Field label="Date of birth">
          {open ? (
            <TextInput correction type="date" name="date_of_birth" value={formData.date_of_birth} onChange={onChange} />
          ) : (
            <Value>
              {profile?.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not set'}
            </Value>
          )}
        </Field>

        <Field label="Age">
          <Value>{profile?.age || 'Not set'}</Value>
        </Field>

        <Field label="Gender">
          {open ? (
            <SelectInput correction name="gender" value={formData.gender} onChange={onChange}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </SelectInput>
          ) : (
            <Value>{profile?.gender || 'Not set'}</Value>
          )}
        </Field>

        <Field label="Branch / department">
          {open ? (
            <SelectInput correction name="branch" value={formData.branch} onChange={onChange}>
              <option value="">Select branch</option>
              {/* Current value first, in case it isn't in the college list */}
              {formData.branch && !collegeBranches.includes(formData.branch) && (
                <option value={formData.branch}>{formData.branch}</option>
              )}
              {collegeBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                  {BRANCH_SHORT_NAMES[b] ? ` (${BRANCH_SHORT_NAMES[b]})` : ''}
                </option>
              ))}
            </SelectInput>
          ) : (
            <Value>
              {profile?.branch}{' '}
              {BRANCH_SHORT_NAMES[profile?.branch] ? (
                <span className="text-spc-teal">({BRANCH_SHORT_NAMES[profile?.branch]})</span>
              ) : (
                ''
              )}
            </Value>
          )}
        </Field>

        <Field label="College">
          <Value>{profile?.college_name}</Value>
        </Field>

        <Field label="Region">
          <Value>{profile?.region_name}</Value>
        </Field>

        <Field label="Email address" span={cols !== 1}>
          <div className="flex items-center gap-2 flex-wrap">
            <Value>{userEmail}</Value>
            {profile?.email_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-spc-ok-bg text-spc-ok text-xs font-bold px-2 py-0.5">
                <CheckCircle2 size={12} />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-spc-bad-bg text-spc-bad text-xs font-bold px-2 py-0.5">
                <X size={12} />
                <span>Not verified</span>
              </span>
            )}
          </div>
        </Field>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------ your details */

export function ContactDetails({ profile, formData, editMode, onChange, cols = 2 }) {
  const grid = cols === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
  return (
    <SectionCard title="Contact details" icon={User}>
      <div className="space-y-4">
        <Field label="Mobile number">
          {editMode ? (
            <TextInput
              type="tel"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={onChange}
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
            />
          ) : (
            <Value>{profile?.mobile_number || 'Not set'}</Value>
          )}
        </Field>

        <div className={`grid ${grid} gap-4`}>
          <Field label="Height (cm)">
            {editMode ? (
              <SelectInput name="height" value={formData.height} onChange={onChange}>
                <option value="">Select height</option>
                {Array.from({ length: 81 }, (_, i) => 140 + i).map((h) => (
                  <option key={h} value={h}>{h} cm</option>
                ))}
              </SelectInput>
            ) : (
              <Value>{profile?.height ? `${profile.height} cm` : 'Not set'}</Value>
            )}
          </Field>

          <Field label="Weight (kg)">
            {editMode ? (
              <SelectInput name="weight" value={formData.weight} onChange={onChange}>
                <option value="">Select weight</option>
                {Array.from({ length: 121 }, (_, i) => 30 + i).map((w) => (
                  <option key={w} value={w}>{w} kg</option>
                ))}
              </SelectInput>
            ) : (
              <Value>{profile?.weight ? `${profile.weight} kg` : 'Not set'}</Value>
            )}
          </Field>
        </div>

        <Field label="Complete address">
          {editMode ? (
            <TextArea
              name="complete_address"
              value={formData.complete_address}
              onChange={onChange}
              placeholder="Enter your complete address"
              rows="3"
            />
          ) : (
            <Value>{profile?.complete_address || 'Not set'}</Value>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------- academic */

export function AcademicSection({ profile, formData, editMode, onChange, cgpaLocked, cgpaUnlockEnd, cols = 3 }) {
  const approved = profile?.registration_status === 'approved';
  const canEdit = editMode && !(cgpaLocked && approved);
  const grid = cols === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <SectionCard title="Academic performance" icon={GraduationCap}>
      {approved && <LockNotice locked={cgpaLocked} unlockEnd={cgpaUnlockEnd} subject="CGPA" />}

      <div className={`grid ${grid} gap-3`}>
        {[1, 2, 3, 4, 5, 6].map((sem) => (
          <Field key={sem} label={`Sem ${sem} SGPA`}>
            {canEdit ? (
              <TextInput
                type="number"
                name={`cgpa_sem${sem}`}
                value={formData[`cgpa_sem${sem}`]}
                onChange={onChange}
                placeholder="0.00"
                min="0"
                max="10"
                step="0.01"
              />
            ) : (
              <Value muted={cgpaLocked && editMode}>{profile?.[`cgpa_sem${sem}`] || 'Not set'}</Value>
            )}
          </Field>
        ))}
      </div>

      <div className="mt-5 rounded-spc bg-spc-teal p-4">
        <p className="text-spc-label font-bold uppercase text-spc-on-teal-dim">Programme CGPA</p>
        <p className="text-spc-metric font-extrabold text-spc-on-teal mt-1">
          {profile?.programme_cgpa || 'Not calculated'}
        </p>
        <p className="text-xs text-spc-on-teal-dim mt-1.5">
          Averaged automatically from every semester you&apos;ve filled in.
        </p>
      </div>
    </SectionCard>
  );
}

/* --------------------------------------------------------------- documents */

const DOCUMENTS = [
  { name: 'has_driving_license', label: 'Driving licence', editLabel: 'I have a valid driving licence' },
  { name: 'has_pan_card', label: 'PAN card', editLabel: 'I have a PAN card' },
  { name: 'has_aadhar_card', label: 'Aadhaar card', editLabel: 'I have an Aadhaar card' },
  { name: 'has_passport', label: 'Passport', editLabel: 'I have a passport' },
];

export function DocumentsSection({ profile, formData, editMode, onChange }) {
  return (
    <SectionCard title="Documents" icon={FileText}>
      <div className="space-y-2">
        {DOCUMENTS.map((doc) =>
          editMode ? (
            <label
              key={doc.name}
              htmlFor={doc.name}
              className="flex items-center gap-3 min-h-[52px] px-3.5 rounded-spc-sm
                bg-spc-surface-2 cursor-pointer"
            >
              <input
                id={doc.name}
                type="checkbox"
                name={doc.name}
                checked={formData[doc.name]}
                onChange={onChange}
                className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal"
              />
              <span className="text-spc-sm font-semibold text-spc-ink">{doc.editLabel}</span>
            </label>
          ) : (
            <div
              key={doc.name}
              className="flex items-center justify-between gap-3 min-h-[52px] px-3.5 rounded-spc-sm bg-spc-surface-2"
            >
              <span className="text-spc-sm font-semibold text-spc-body">{doc.label}</span>
              {profile?.[doc.name] ? (
                <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-xs font-bold px-2.5 py-1">
                  <CheckCircle2 size={13} />
                  <span>Yes</span>
                </span>
              ) : (
                <span className="text-spc-xs font-semibold text-spc-muted">No</span>
              )}
            </div>
          )
        )}
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------- backlogs */

export function BacklogsSection({ profile, formData, editMode, onChange, backlogLocked, backlogUnlockEnd, cols = 3 }) {
  const approved = profile?.registration_status === 'approved';
  const canEdit = editMode && !(backlogLocked && approved);
  const grid = cols === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  const typedTotal =
    (parseInt(formData.backlogs_sem1) || 0) +
    (parseInt(formData.backlogs_sem2) || 0) +
    (parseInt(formData.backlogs_sem3) || 0) +
    (parseInt(formData.backlogs_sem4) || 0) +
    (parseInt(formData.backlogs_sem5) || 0) +
    (parseInt(formData.backlogs_sem6) || 0);

  const total = editMode ? typedTotal : profile?.backlog_count || 0;
  const anyBacklogs = profile?.backlog_count > 0 || typedTotal > 0;

  return (
    <SectionCard title="Backlogs" icon={FileText}>
      {approved && <LockNotice locked={backlogLocked} unlockEnd={backlogUnlockEnd} subject="Backlog" />}

      <div className={`grid ${grid} gap-3`}>
        {[1, 2, 3, 4, 5, 6].map((sem) => (
          <Field key={sem} label={`Sem ${sem}`}>
            {canEdit ? (
              <SelectInput
                name={`backlogs_sem${sem}`}
                value={formData[`backlogs_sem${sem}`]}
                onChange={onChange}
              >
                <option value="0">0</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={String(num)}>{num}</option>
                ))}
              </SelectInput>
            ) : (
              <Value muted={backlogLocked && editMode}>
                {profile?.[`backlogs_sem${sem}`] !== undefined ? profile[`backlogs_sem${sem}`] : '0'}
              </Value>
            )}
          </Field>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-spc-sm bg-spc-surface-2 px-4 py-3">
        <span className="text-spc-label font-bold uppercase text-spc-muted">Total backlogs</span>
        <span className={`text-spc-h1 font-extrabold ${anyBacklogs ? 'text-spc-bad' : 'text-spc-ok'}`}>
          {total}
        </span>
      </div>

      <div className="mt-4">
        <Field label="Backlog details">
          {canEdit ? (
            <TextArea
              name="backlog_details"
              value={formData.backlog_details}
              onChange={onChange}
              placeholder="Specify subjects (if any)"
              rows="2"
            />
          ) : (
            <Value>{profile?.backlog_details || 'None'}</Value>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------- photo */

export function PhotoSection({ profile }) {
  // Tracks a photo whose URL exists but fails to load — a deleted or expired
  // upload otherwise leaves a broken-image icon and raw alt text on the page.
  const [failed, setFailed] = useState(false);

  if (!profile?.photo_url) return null;

  return (
    <SectionCard title="Profile photo" icon={User}>
      {failed ? (
        <div className="w-36 h-36 rounded-spc border border-spc-line bg-spc-surface-2 flex flex-col items-center justify-center gap-2 text-center px-3">
          <User size={26} className="text-spc-muted" />
          <span className="text-xs text-spc-muted leading-snug">Photo unavailable</span>
        </div>
      ) : (
        <img
          src={profile.photo_url}
          alt="Your profile"
          onError={() => setFailed(true)}
          className="w-36 h-36 object-cover rounded-spc border border-spc-line bg-spc-surface-2"
        />
      )}
      <p className="text-spc-xs text-spc-muted mt-3">
        Your photo can only be changed if your placement officer requests a correction.
      </p>
    </SectionCard>
  );
}

/* -------------------------------------------------------- extended profile */

export function ExtendedProfileSummary({ extendedProfile, cols = 2 }) {
  const p = extendedProfile?.profile;
  if (!p) return null;
  const pct = p.profile_completion_percentage || 0;
  const grid = cols === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';

  const groups = [];
  if (p.sslc_marks || p.twelfth_marks) {
    groups.push({
      key: 'academic',
      title: 'Academic',
      icon: GraduationCap,
      rows: [
        p.sslc_marks && ['SSLC', `${p.sslc_marks}% (${p.sslc_board}, ${p.sslc_year})`],
        p.twelfth_marks && ['12th', `${p.twelfth_marks}% (${p.twelfth_board}, ${p.twelfth_year})`],
      ].filter(Boolean),
    });
  }
  if (p.father_name || p.mother_name) {
    groups.push({
      key: 'family',
      title: 'Family',
      icon: Users,
      rows: [
        p.father_name && ['Father', `${p.father_name}${p.father_occupation ? ` (${p.father_occupation})` : ''}`],
        p.mother_name && ['Mother', `${p.mother_name}${p.mother_occupation ? ` (${p.mother_occupation})` : ''}`],
      ].filter(Boolean),
    });
  }
  if (p.has_driving_license || p.has_pan_card || p.has_aadhar_card || p.has_passport) {
    groups.push({
      key: 'documents',
      title: 'Documents held',
      icon: FileText,
      chips: [
        p.has_driving_license && 'Driving licence',
        p.has_pan_card && 'PAN card',
        p.has_aadhar_card && 'Aadhaar card',
        p.has_passport && 'Passport',
      ].filter(Boolean),
    });
  }
  if (p.district || p.interests_hobbies) {
    groups.push({
      key: 'personal',
      title: 'Personal',
      icon: User,
      rows: [
        p.district && ['District', p.district],
        p.interests_hobbies && ['Interests', p.interests_hobbies],
      ].filter(Boolean),
    });
  }

  return (
    <SectionCard
      title="Extended profile"
      icon={FileText}
      action={
        <Link
          to="/student/extended-profile"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-spc-sm
            bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-xs font-bold
            hover:bg-spc-surface-2 transition-colors flex-shrink-0"
        >
          <Edit size={15} />
          <span>Edit</span>
        </Link>
      }
    >
      <div className="rounded-spc-sm bg-spc-surface-2 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-spc-label font-bold uppercase text-spc-muted">Completion</span>
          <span className="text-spc-h2 font-extrabold text-spc-ink">{pct}%</span>
        </div>
        <div
          className="w-full bg-spc-line rounded-full h-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Extended profile completion"
        >
          <div className="bg-spc-teal h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`grid ${grid} gap-3`}>
        {groups.map((group) => (
          <div key={group.key} className="rounded-spc-sm bg-spc-surface-2 p-4">
            <h3 className="flex items-center gap-2 text-spc-label font-bold uppercase text-spc-muted mb-2.5">
              <group.icon size={14} className="text-spc-teal" />
              <span>{group.title}</span>
            </h3>
            {group.chips ? (
              <div className="flex flex-wrap gap-1.5">
                {group.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-xs font-bold px-2 py-1"
                  >
                    <CheckCircle2 size={12} />
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <dl className="space-y-2">
                {group.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-spc-muted">{label}</dt>
                    <dd className="text-spc-xs font-semibold text-spc-ink break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------- security / account */

export function SecurityCard({ onChangePassword }) {
  return (
    <SectionCard title="Security" icon={Shield}>
      <p className="text-spc-xs text-spc-muted mb-4">
        Keep your account secure with a strong password you don&apos;t use elsewhere.
      </p>
      <button
        type="button"
        onClick={onChangePassword}
        className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
          bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-sm font-bold
          hover:bg-spc-surface-2 transition-colors"
      >
        <Lock size={17} />
        <span>Change password</span>
      </button>
    </SectionCard>
  );
}

const STATUS_META = {
  pending: { label: 'Pending approval', classes: 'bg-spc-warn-bg text-spc-warn' },
  approved: { label: 'Approved', classes: 'bg-spc-ok-bg text-spc-ok' },
  rejected: { label: 'Rejected', classes: 'bg-spc-bad-bg text-spc-bad' },
  blacklisted: { label: 'Blacklisted', classes: 'bg-spc-ink text-spc-surface' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, classes: 'bg-spc-surface-2 text-spc-body' };
  return (
    <span className={`inline-flex items-center rounded-spc-sm text-spc-xs font-bold px-3 py-1.5 ${meta.classes}`}>
      {meta.label}
    </span>
  );
}

export function AccountInfoCard({ profile, user }) {
  const rows = [
    ['Role', 'Student'],
    ['Registration status', <StatusBadge key="s" status={profile?.registration_status} />],
    [
      'Registered on',
      profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A',
    ],
    [
      'Last login',
      user?.last_login
        ? new Date(user.last_login).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'N/A',
    ],
  ];

  return (
    <SectionCard title="Account" icon={Shield}>
      <dl className="divide-y divide-spc-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <dt className="text-spc-xs font-semibold text-spc-muted">{label}</dt>
            <dd className="text-spc-xs font-semibold text-spc-ink text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

const STATUS_NOTICE = {
  pending: {
    title: 'Pending approval',
    body: 'Your registration is under review by your placement officer. You will get access to job postings once approved.',
    tone: 'bg-spc-warn-bg',
  },
  rejected: {
    title: 'Registration rejected',
    body: 'Please contact your placement officer for more information.',
    tone: 'bg-spc-bad-bg',
  },
  blacklisted: {
    title: 'Account blacklisted',
    body: 'Your account has been restricted. Contact your placement officer for details.',
    tone: 'bg-spc-surface-2',
  },
};

export function StatusNotice({ status }) {
  const notice = STATUS_NOTICE[status];
  if (!notice) return null;
  return (
    <section className={`rounded-spc p-5 ${notice.tone}`}>
      <h2 className="text-spc-h3 font-bold text-spc-ink">{notice.title}</h2>
      <p className="text-spc-xs text-spc-body mt-1.5">{notice.body}</p>
    </section>
  );
}
