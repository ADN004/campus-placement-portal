import { Check, GraduationCap, RefreshCw } from 'lucide-react';

/**
 * Pieces shared by the three WaitingPage presenters.
 *
 * The page has one job — tell a student their registration is with their
 * placement officer and that nothing is required of them — so the design leans
 * on a real status timeline rather than a paragraph. The teal panel carries a
 * kasavu pinstripe (see index.css), the Kerala handloom gold-warp border, which
 * is where the palette came from in the first place.
 */

export const STEPS = [
  {
    key: 'registered',
    title: 'Registration submitted',
    body: 'Your details are in and your account exists.',
  },
  {
    key: 'review',
    title: 'With your placement officer',
    body: 'They check your details against your college records.',
  },
  {
    key: 'approved',
    title: 'Full access',
    body: 'Browse openings, apply, and build your resume.',
  },
];

/** Index of the step currently in progress. */
export const CURRENT_STEP = 1;

/* ------------------------------------------------------------- timeline */

function StepDot({ state }) {
  if (state === 'done') {
    return (
      <span className="w-7 h-7 rounded-full bg-spc-teal flex items-center justify-center flex-shrink-0">
        <Check size={15} className="text-spc-on-teal" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="spc-pulse w-7 h-7 rounded-full bg-spc-surface border-2 border-spc-teal flex items-center justify-center flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-spc-teal" />
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-spc-surface border-2 border-spc-line-strong flex-shrink-0" />
  );
}

function stateOf(index) {
  if (index < CURRENT_STEP) return 'done';
  if (index === CURRENT_STEP) return 'current';
  return 'upcoming';
}

/** Vertical rail — phones, where three steps side by side would be unreadable. */
export function TimelineVertical() {
  return (
    <ol className="relative">
      {STEPS.map((step, index) => {
        const state = stateOf(index);
        const last = index === STEPS.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-8 bottom-1 w-0.5 rounded-full
                  ${index < CURRENT_STEP ? 'bg-spc-teal' : 'bg-spc-line'}`}
              />
            )}
            <StepDot state={state} />
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-spc-h3 font-bold leading-tight
                  ${state === 'upcoming' ? 'text-spc-muted' : 'text-spc-ink'}`}
              >
                {step.title}
              </p>
              <p className="text-spc-xs text-spc-muted mt-1">{step.body}</p>
              {state === 'current' && (
                <span className="inline-flex items-center gap-1.5 mt-2 rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1">
                  Happening now
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Horizontal rail — tablet and desktop, where the width earns it. */
export function TimelineHorizontal() {
  return (
    <ol className="grid grid-cols-3 gap-4">
      {STEPS.map((step, index) => {
        const state = stateOf(index);
        return (
          <li key={step.key} className="relative">
            <div className="flex items-center gap-2 mb-3">
              <StepDot state={state} />
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 rounded-full
                  ${index < CURRENT_STEP ? 'bg-spc-teal' : 'bg-spc-line'}
                  ${index === STEPS.length - 1 ? 'opacity-0' : ''}`}
              />
            </div>
            <p
              className={`text-spc-h3 font-bold leading-tight
                ${state === 'upcoming' ? 'text-spc-muted' : 'text-spc-ink'}`}
            >
              {step.title}
            </p>
            <p className="text-spc-xs text-spc-muted mt-1.5">{step.body}</p>
            {state === 'current' && (
              <span className="inline-flex items-center gap-1.5 mt-2.5 rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1">
                Happening now
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- panel */

/**
 * The teal identity panel. `orientation="side"` fills a desktop column;
 * `"band"` is a shorter header strip for tablet and phone.
 */
export function KasavuPanel({ name, prn, orientation = 'band' }) {
  const side = orientation === 'side';

  return (
    <div
      className={`relative overflow-hidden bg-spc-teal ${
        side ? 'h-full rounded-spc-lg p-8 flex flex-col' : 'rounded-spc-lg p-6'
      }`}
    >
      {/* Gold warp threads, fading out across the panel. */}
      <span
        aria-hidden="true"
        className="spc-kasavu absolute inset-x-0 top-0 h-full opacity-40"
        style={{ maskImage: 'linear-gradient(to bottom, black, transparent 62%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 62%)' }}
      />

      <div className="relative">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-spc bg-spc-on-teal/15 mb-5">
          <GraduationCap size={24} className="text-spc-on-teal" />
        </span>

        <p className="text-spc-label font-bold uppercase text-spc-on-teal-dim">
          State Placement Cell
        </p>
        <p className={`${side ? 'text-spc-h1-lg' : 'text-spc-h1'} font-extrabold text-spc-on-teal mt-1 break-words`}>
          {name || 'Welcome'}
        </p>
        {prn && (
          <p className="text-spc-xs text-spc-on-teal-dim mt-1.5 font-semibold">PRN {prn}</p>
        )}
      </div>

      {side && (
        <div className="relative mt-auto pt-8">
          <span
            aria-hidden="true"
            className="spc-kasavu block h-4 w-24 opacity-90 mb-4"
          />
          <p className="text-spc-xs text-spc-on-teal-dim leading-relaxed max-w-[34ch]">
            Kerala Polytechnics · Directorate of Technical Education. Your
            registration is reviewed by the placement officer at your own college.
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- details */

export function DetailGrid({ profile, email, cols = 2 }) {
  const rows = [
    ['Registered email', email],
    ['College', profile?.college_name],
    ['Branch', profile?.branch],
    [
      'Submitted on',
      profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
    ],
  ].filter(([, value]) => Boolean(value));

  if (rows.length === 0) return null;

  return (
    <dl className={`grid gap-x-6 gap-y-4 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-spc-label font-bold uppercase text-spc-muted">{label}</dt>
          <dd className="text-spc-sm font-semibold text-spc-ink mt-1 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------- refresh */

export function RefreshButton({ refreshing, onRefresh, full = false }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
        bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity
        disabled:opacity-60 disabled:cursor-wait ${full ? 'w-full' : ''}`}
    >
      <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
      <span>{refreshing ? 'Checking…' : 'Check again'}</span>
    </button>
  );
}

export function ReassuranceNote() {
  return (
    <p className="text-spc-xs text-spc-muted leading-relaxed">
      There&apos;s nothing more for you to do — you&apos;ll get an email the moment
      you&apos;re approved. Most registrations are reviewed within a few working days.
      If it&apos;s been longer, contact the placement officer at your college.
    </p>
  );
}
