import { AlertTriangle } from 'lucide-react';

/**
 * What did not load, said once, with a way to try again.
 *
 * Pairs with useLoadFailures. Renders nothing when everything arrived, which is
 * almost always, so a healthy page is unchanged.
 *
 * The wording names the parts rather than the error, because the error is not
 * the useful half. An admin looking at an empty college picker needs to know
 * that the colleges are missing rather than that there are none -- what the
 * server said about why is in the console, and is not something they can act
 * on. What they can act on is Retry, and knowing not to trust the empty space
 * in the meantime.
 */
export default function LoadFailureNotice({ names = [], onRetry, className = '' }) {
  if (names.length === 0) return null;

  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return (
    <div
      role="status"
      className={`rounded-spc-admin border border-spc-warn/40 bg-spc-warn-bg
        px-4 py-3 mb-4 flex items-start gap-3 flex-wrap ${className}`}
    >
      <AlertTriangle size={17} className="text-spc-warn flex-shrink-0 mt-0.5" aria-hidden="true" />

      {/* min-w-0 so a long list of names wraps inside the notice rather than
          pushing Retry off the side of a phone. */}
      <p className="text-spc-xs text-spc-ink min-w-0 flex-1">
        <span className="font-bold">Could not load {list}.</span>{' '}
        Anything on this page that depends on {names.length === 1 ? 'it' : 'them'} may
        look empty when it is not.
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-spc-xs font-bold text-spc-accent hover:underline underline-offset-2
            min-h-[44px] sm:min-h-0 sm:py-1 px-1 flex-shrink-0"
        >
          Try again
        </button>
      )}
    </div>
  );
}
