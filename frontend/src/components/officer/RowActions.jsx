import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import useDeviceType from '../../hooks/useDeviceType';
import { ACTION_TONE } from './OfficerUI';

/**
 * The actions on a table row: a few kept in place, the rest behind one trigger.
 *
 * Rows used to lay every action out side by side. On Manage Students that is up
 * to five buttons, and two of them carry words because they are consequential —
 * so at 120% browser zoom the Actions column ran past the edge of the table and
 * had to be dragged into view. Adding a sixth action anywhere meant re-checking
 * every width again.
 *
 * Actions are data now. `inline: true` keeps one in the row — used for approve
 * and reject, which an officer does fifty times in a sitting and should not
 * cost two taps — and everything else goes in the menu. A new action is one
 * entry in the array, and the column width never changes.
 *
 * The menu is portaled to the body. Rendered in place it is clipped by the
 * table's own horizontal scroll container, which is the very thing this exists
 * to escape.
 *
 * @param {Array<{key, label, description, icon, tone, onSelect, hidden, inline}>} actions
 * @param {string} subject  Names the row for screen readers: "Actions for Anu K".
 */
export default function RowActions({ actions, subject }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const deviceType = useDeviceType();
  const isSheet = deviceType === 'mobile';

  const shown = actions.filter((a) => !a.hidden);
  const inline = shown.filter((a) => a.inline);
  const menu = shown.filter((a) => !a.inline);

  // Position under the trigger, flipping above it when there is no room below.
  useLayoutEffect(() => {
    if (!open || isSheet || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const height = menu.length * 44 + 16;
    const below = window.innerHeight - r.bottom;
    setCoords({
      top: below < height + 12 ? Math.max(8, r.top - height - 6) : r.bottom + 6,
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, [open, isSheet, menu.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    // A menu anchored to a row cannot follow it, so close rather than drift.
    const onScroll = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', onScroll);
    if (!isSheet) window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, isSheet]);

  useEffect(() => {
    /*
     * preventScroll matters. Focusing the first item scrolled its nearest
     * scrollable ancestor — the table's own horizontal scroll box — which fired
     * a scroll event, which the handler above reads as "the row moved" and
     * closes the menu. The menu opened and shut in the same frame, so it looked
     * like the trigger simply did nothing.
     */
    if (open) menuRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [open, coords]);

  const choose = (action) => {
    setOpen(false);
    action.onSelect();
  };

  const panel = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${subject}`}
      className={
        isSheet
          ? `fixed inset-x-0 bottom-0 z-[60] bg-spc-surface border-t-[1.5px] border-spc-rule-structural
             rounded-t-spc-panel pb-[env(safe-area-inset-bottom)]`
          : `fixed z-[60] min-w-[13rem] bg-spc-surface border border-spc-line-strong
             rounded-spc-panel overflow-hidden`
      }
      style={isSheet ? undefined : { top: coords?.top ?? -9999, right: coords?.right ?? 8 }}
    >
      {isSheet && (
        <p className="px-4 pt-3 pb-2 text-spc-label font-bold uppercase tracking-[0.11em] text-spc-muted">
          {subject}
        </p>
      )}
      {menu.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            type="button"
            role="menuitem"
            onClick={() => choose(a)}
            className={`w-full flex items-center gap-2.5 px-4 min-h-[44px] text-left text-spc-xs
              font-bold border-b border-spc-line last:border-b-0 transition-colors
              hover:bg-spc-surface-2 ${ACTION_TONE[a.tone] || 'text-spc-ink'}`}
          >
            {Icon && <Icon size={17} aria-hidden="true" className="flex-shrink-0" />}
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex items-center gap-0.5 flex-nowrap justify-end">
      {/*
        Icon only, including the coloured ones.
        Elsewhere in this role the rule is "if it is coloured, it is labelled",
        because a word is what stops a mis-click on something consequential.
        That word is no longer the only guard: approve and reject now open a
        confirmation naming the student and spelling out what happens. Two
        labelled buttons cost about 110px, which was the whole of the remaining
        overflow on the pending tab — paying that for a second warning in front
        of a dialog that already warns is a poor trade. Colour, icon, tooltip
        and accessible name all still distinguish them.
      */}
      {inline.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            type="button"
            onClick={a.onSelect}
            aria-label={a.description || a.label}
            title={a.description || a.label}
            className={`inline-flex items-center justify-center w-11 min-h-[44px] flex-shrink-0
              rounded-spc-control transition-colors
              ${ACTION_TONE[a.tone] || ACTION_TONE.default}`}
          >
            {Icon && <Icon size={18} aria-hidden="true" />}
          </button>
        );
      })}

      {menu.length > 0 && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Actions for ${subject}`}
          title="More actions"
          className={`inline-flex items-center justify-center w-11 min-h-[44px] flex-shrink-0
            rounded-spc-control transition-colors ${ACTION_TONE.default}
            ${open ? 'bg-spc-surface-3' : ''}`}
        >
          <MoreVertical size={18} aria-hidden="true" />
        </button>
      )}

      {open && createPortal(
        <>
          {isSheet && (
            <div
              className="fixed inset-0 z-[55] bg-spc-ink/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}
          {panel}
        </>,
        document.body
      )}
    </div>
  );
}
