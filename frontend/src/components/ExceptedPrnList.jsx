import { useState } from 'react';

// Real PRNs are 10 digits, so even a few make the row very wide. A single
// exception is shown inline; anything more collapses to a count-only link
// ("8 excepted PRNs — show") that expands to the full list on click.
export default function ExceptedPrnList({ prns }) {
  const [expanded, setExpanded] = useState(false);

  if (!prns || prns.length === 0) return null;

  const toggle = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="mt-1 text-xs font-semibold text-red-600 font-sans">
      {prns.length === 1 ? (
        <>Except: {prns[0]}</>
      ) : expanded ? (
        <>
          Except: {prns.join(', ')}
          <button
            type="button"
            onClick={toggle}
            className="ml-1.5 text-red-700 underline decoration-dotted underline-offset-2 hover:text-red-900"
          >
            hide
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className="text-red-700 underline decoration-dotted underline-offset-2 hover:text-red-900"
        >
          {prns.length} excepted PRNs — show
        </button>
      )}
    </div>
  );
}
