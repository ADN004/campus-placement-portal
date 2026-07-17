import { useState } from 'react';

// Keep rows compact: long exception lists collapse to the first few PRNs
// with a "+N more" toggle instead of wrapping across many lines.
const COLLAPSED_COUNT = 6;

export default function ExceptedPrnList({ prns }) {
  const [expanded, setExpanded] = useState(false);

  if (!prns || prns.length === 0) return null;

  const visible = expanded ? prns : prns.slice(0, COLLAPSED_COUNT);
  const hiddenCount = prns.length - COLLAPSED_COUNT;

  return (
    <div className="mt-1 text-xs font-semibold text-red-600 font-sans">
      Except: {visible.join(', ')}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="ml-1.5 text-red-700 underline decoration-dotted underline-offset-2 hover:text-red-900"
        >
          {expanded ? 'show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
