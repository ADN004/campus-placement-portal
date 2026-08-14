import { describeDeadlineInput } from '../utils/deadline';

/**
 * Says which clock the deadline field uses, and reads the typed value back.
 *
 * The date-and-time input draws its clock in the browser's locale, which here
 * is usually the 24-hour one, and nothing on screen says so. Someone who wants
 * applications to close at half past six in the evening types 6:30, sees 06:30,
 * and has set half past six in the morning. Every step agrees with them; the
 * mistake only surfaces when applications close twelve hours early.
 *
 * Two things prevent that, and they work at different moments. The format note
 * is there before anything is typed, so the officer knows what the box wants.
 * The echo appears once there is a value and says it in words, because reading
 * "6:30 am" is what catches an error that "06:30" hides.
 *
 * Any time before noon also offers the evening reading and the exact digits
 * that would produce it. Not only the small hours: the mistake is not about
 * unusual times, it is about not knowing the clock is 24-hour, and on that
 * misunderstanding 7:00 means the evening just as surely as 1:30 means the
 * afternoon. It stays a suggestion — a morning deadline is legitimate, and the
 * officer is the one who knows which they meant.
 *
 * `variant` picks the palette rather than the caller restyling this: the
 * officer screens are on the design-system tokens, the Super Admin's are still
 * on plain Tailwind greys, and one hard-coded set of colours would look wrong
 * in one of the two.
 */
export default function DeadlineEcho({ value, variant = 'officer' }) {
  const officer = variant === 'officer';
  const muted = officer ? 'text-spc-muted' : 'text-gray-500';
  const base = officer ? 'text-spc-body' : 'text-gray-600';
  const strong = officer ? 'text-spc-ink' : 'text-gray-900';
  const warn = officer ? 'text-spc-warn' : 'text-amber-600';

  const parsed = describeDeadlineInput(value);

  return (
    <>
      <p className={`mt-1 text-xs ${muted}`}>
        24-hour clock — type <span className="font-bold tabular-nums">18:30</span> for 6:30 pm.
      </p>

      {parsed && (
        <p className={`mt-1 text-xs ${base}`}>
          <span>Closes </span>
          <span className={`font-bold ${strong}`}>
            {parsed.day} at {parsed.time}
          </span>
          {parsed.isMorning && (
            <>
              <br />
              <span className={`font-semibold ${warn}`}>
                {parsed.isEarlyMorning ? 'That is early morning.' : 'That is the morning.'}
                {' '}For {parsed.eveningLabel}, type{' '}
                <span className="tabular-nums">{parsed.eveningEntry}</span> instead.
              </span>
            </>
          )}
        </p>
      )}
    </>
  );
}
