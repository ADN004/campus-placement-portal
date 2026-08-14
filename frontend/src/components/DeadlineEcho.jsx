import { describeDeadlineInput } from '../utils/deadline';

/**
 * Reads a typed application deadline back in plain language, under the field.
 *
 * The date-and-time input draws its clock in the browser's locale, which here
 * is usually the 24-hour one. Someone who means noon types 1:30, sees 01:30,
 * and has just set the deadline for half past one in the morning. Every step
 * agrees with them; the mistake only appears when applications close twelve
 * hours early and the officer has no idea why.
 *
 * Saying the value back in words — "Tuesday, 18 August 2026 at 1:30 am" — is
 * what catches it, because the reader does not have to convert anything to spot
 * that it is wrong. The meridiem is emphasised since that is the part being
 * checked.
 *
 * `variant` picks the palette rather than the caller restyling this: the
 * officer screens are on the design-system tokens, the Super Admin's are still
 * on plain Tailwind greys, and one hard-coded set of colours would look wrong
 * in one of the two.
 */
export default function DeadlineEcho({ value, variant = 'officer' }) {
  const parsed = describeDeadlineInput(value);
  if (!parsed) return null;

  const officer = variant === 'officer';
  const base = officer ? 'text-spc-body' : 'text-gray-600';
  const strong = officer ? 'text-spc-ink' : 'text-gray-900';
  const warn = officer ? 'text-spc-warn' : 'text-amber-600';

  return (
    <p className={`mt-1.5 text-xs ${base}`}>
      <span>Closes </span>
      <span className={`font-bold ${strong}`}>
        {parsed.day} at {parsed.time}
      </span>
      {parsed.looksLikeAmPmSlip && (
        <>
          <br />
          <span className={`font-semibold ${warn}`}>
            That is {parsed.time} — early morning. If you meant the afternoon,
            add 12 to the hour.
          </span>
        </>
      )}
    </p>
  );
}
