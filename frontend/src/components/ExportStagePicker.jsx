import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EXPORT_STAGES } from '../utils/exportFilters';

/**
 * Which stages go into the file, chosen on the export itself.
 *
 * "Give me the shortlisted ones as a spreadsheet" is the most common thing
 * anyone wants from the applicants screen, and until now it meant opening a
 * filter panel somewhere else on the page, ticking a box, closing it, and then
 * finding the export. The boxes belong where the decision is made.
 *
 * Seeded from whatever the page is already filtered to, and then authoritative
 * for the export. That is deliberate, and it settles a question the two
 * controls would otherwise leave open: if the page says Shortlisted and the
 * dialog says Selected, which wins? Neither -- there is one control, and it
 * starts out agreeing with the page. Changing it here changes only this
 * export; the list behind the dialog does not move.
 *
 * Collapsed by default, and that is not a detail. Expanded it costs about 330
 * of the roughly 520 scrollable pixels an export dialog gets on a phone, which
 * pushed every actual export button below the fold: you tapped Export and were
 * shown tick boxes instead of a way to export. Collapsed it is one line that
 * always states the current choice, so the common case -- export everyone --
 * needs no interaction at all and the buttons stay where they were.
 *
 * The counts are the point of expanding. A number beside each stage turns
 * "which of these do I want" into a question with visible consequences, and it
 * is counted after the page's other filters, so "Shortlisted (23)" means 23
 * rows in the file and not 23 people who applied.
 *
 * Every stage unticked means no filter at all rather than an empty file: an
 * export of nobody is never what someone wants, and reading it as "everyone" is
 * both the safer guess and what the export did before these boxes existed.
 */
export default function ExportStagePicker({
  value = [],
  counts = {},
  onChange,
  checkboxClass = 'h-5 w-5 rounded-[4px] border-spc-control text-spc-accent flex-shrink-0',
  collapsible = true,
}) {
  const [open, setOpen] = useState(false);

  const toggle = (stage) => {
    onChange(value.includes(stage)
      ? value.filter((v) => v !== stage)
      : [...value, stage]);
  };

  const total = value.length === 0
    ? EXPORT_STAGES.reduce((n, [stage]) => n + (counts[stage] || 0), 0)
    : value.reduce((n, stage) => n + (counts[stage] || 0), 0);

  const chosenLabels = EXPORT_STAGES
    .filter(([stage]) => value.includes(stage))
    .map(([, label]) => label);

  /** The whole choice in one line, for when the boxes are folded away. */
  const summary = chosenLabels.length === 0 ? 'Every stage' : chosenLabels.join(', ');

  const boxes = (
    <div>
      {EXPORT_STAGES.map(([stage, label, description]) => {
        const checked = value.includes(stage);
        const count = counts[stage] || 0;
        return (
          <label
            key={stage}
            className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer border-t border-spc-line
              min-h-[52px] ${checked ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(stage)}
              className={`${checkboxClass} mt-0.5`}
            />
            {/* min-w-0 so a long description wraps inside the row rather than
                pushing the count off the edge of a phone. */}
            <span className="min-w-0 flex-1">
              <span className="block text-spc-xs font-bold text-spc-ink">
                {label}
                <span className="ml-1.5 font-normal text-spc-body tabular-nums">({count})</span>
              </span>
              <span className="block text-xs text-spc-muted mt-0.5 leading-snug">
                {description}
              </span>
            </span>
          </label>
        );
      })}

      <p className="text-spc-xs text-spc-body px-4 py-2.5 border-t border-spc-line">
        Leave every box unticked to export everyone.
      </p>
    </div>
  );

  if (!collapsible) {
    return (
      <div>
        <p className="text-spc-xs text-spc-body px-4 pt-3 pb-1">
          Tick the stages to include.
        </p>
        {boxes}
      </div>
    );
  }

  return (
    <div>
      {/*
        * The whole control when folded: what will be exported, and how many.
        * Someone who wants everyone -- most people, most of the time -- reads
        * one line and never opens it.
        */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[52px]
          text-left hover:bg-spc-surface-2 transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-spc-xs font-bold text-spc-ink break-words">
            {summary}
            <span className="ml-1.5 font-normal text-spc-body tabular-nums">
              — {total} applicant{total === 1 ? '' : 's'}
            </span>
          </span>
          <span className="block text-xs text-spc-muted mt-0.5">
            {open ? 'Tick the stages to include' : 'Tap to choose which stages to export'}
          </span>
        </span>
        {open
          ? <ChevronUp size={18} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
          : <ChevronDown size={18} className="text-spc-muted flex-shrink-0" aria-hidden="true" />}
      </button>

      {open && boxes}
    </div>
  );
}
