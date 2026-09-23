import { useEffect, useRef, useCallback } from 'react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useFormKeyboard from '../hooks/useFormKeyboard';

/**
 * Accessible modal/dialog primitive (M-1).
 *
 * Drop-in replacement for the app's hand-rolled "overlay div + panel div"
 * modals. It renders the same backdrop + centered panel, but adds the
 * accessibility the ad-hoc versions were missing:
 *
 *   - role="dialog" + aria-modal="true"  → assistive tech announces a dialog
 *     and treats the background as inert.
 *   - aria-label / aria-labelledby        → the dialog is named (from `title`,
 *     or an existing heading's id via `labelledBy`).
 *   - focus trap                          → Tab / Shift+Tab cycle stays inside;
 *     focus moves into the panel on open.
 *   - Escape to close.
 *   - focus restoration                   → focus returns to whatever opened the
 *     modal when it closes.
 *   - body scroll lock (reuses useBodyScrollLock).
 *
 * Adoption is minimal: replace the two outer <div>s with <Modal> and move the
 * panel's classes to `panelClassName`. The header/body/footer markup inside is
 * unchanged. Mouse behaviour (backdrop click, ✕/Cancel via onClose) is
 * preserved.
 *
 * Only mount this while the modal is open (the existing pattern:
 * `{isOpen && <MyModal .../>}` or an early `if (!isOpen) return null`).
 *
 * Props:
 *   onClose         — called on Escape, backdrop click, and by your ✕/Cancel.
 *   title           — accessible name (sets aria-label). Use when the visible
 *                     heading isn't easily given an id.
 *   labelledBy      — id of a visible heading to name the dialog (preferred over
 *                     title when available); wins over `title`.
 *   describedBy     — optional id of descriptive text (aria-describedby).
 *   panelClassName  — classes for the dialog panel (the white card).
 *   overlayClassName— classes for the backdrop/centering layer.
 *   closeOnBackdrop — close when the backdrop itself is clicked. Default FALSE,
 *                     to match this app's existing modals (which close via
 *                     their ✕/Cancel buttons and Escape, not an outside click,
 *                     so a form isn't lost to a stray click). Pass true only
 *                     for modals that intentionally dismiss on backdrop.
 *   closeOnEscape   — close on Escape (default true).
 *   initialFocusRef — optional ref to focus on open (else the first field, and
 *                     failing that the first focusable).
 *   enterAdvances   — Enter moves to the next field rather than submitting from
 *                     wherever focus happens to be (default true). Textareas,
 *                     buttons, checkboxes and radios are left alone.
 *   onEnterSubmit   — called when Enter is pressed on the LAST field. Omit it
 *                     and the last field keeps its native behaviour, which for
 *                     a dialog built on <form> is to submit.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({
  onClose,
  title,
  labelledBy,
  describedBy,
  children,
  panelClassName = 'bg-white rounded-lg shadow-xl max-w-md w-full',
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4',
  closeOnBackdrop = false,
  closeOnEscape = true,
  initialFocusRef,
  enterAdvances = true,
  onEnterSubmit,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useBodyScrollLock(true);

  const getFocusable = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return [];
    // Visible focusables only (getClientRects is empty for display:none, and
    // works for content inside a position:fixed overlay unlike offsetParent).
    return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => el.getClientRects().length > 0
    );
  }, []);

  /*
   * Where focus lands on open.
   *
   * The first focusable in a dialog is almost always the header's ✕, because
   * the header comes first in the DOM. That meant opening any dialog in the
   * app put focus on Close: typing did nothing, and Enter -- the most natural
   * key to press next -- dismissed the dialog the person had just opened.
   *
   * So a dialog that asks for something focuses the first thing it asks for.
   * A dialog that only confirms has no field, falls through to the first
   * focusable, and behaves exactly as it did.
   */
  const getInitialTarget = useCallback(() => {
    if (initialFocusRef && initialFocusRef.current) return initialFocusRef.current;

    const panel = panelRef.current;
    if (panel) {
      const field = Array.from(
        panel.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      ).find((el) => el.getClientRects().length > 0 && el.type !== 'hidden');
      if (field) return field;
    }

    return getFocusable()[0] || panelRef.current;
  }, [initialFocusRef, getFocusable]);

  // On open: remember the trigger and move focus into the panel.
  // On close/unmount: restore focus to the trigger.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const target = getInitialTarget();
    // Defer a tick so the panel is laid out before we focus into it.
    const id = window.setTimeout(() => target && target.focus && target.focus(), 0);
    return () => {
      window.clearTimeout(id);
      const prev = previouslyFocused.current;
      if (prev && prev.focus) prev.focus();
    };
    // Run once for the lifetime of the open modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Enter moves to the next field instead of doing nothing.
   *
   * Officers fill these dialogs in back to back, and the web's default gives
   * them a choice between Tab and the mouse. Enter is what the hand reaches
   * for, so Enter advances and Shift+Enter goes back.
   *
   * On the last field it calls onEnterSubmit where a dialog provides one, and
   * otherwise does not intervene at all -- so a dialog built on a real <form>
   * keeps submitting natively from its final field, and a dialog with no
   * submit does what it always did. Confirmation dialogs are untouched: focus
   * sits on a button there, and the hook ignores buttons.
   */
  const advance = useFormKeyboard({ onSubmit: onEnterSubmit, enabled: enterAdvances });

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') advance(e);

      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        if (onClose) onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        // Nothing focusable — keep focus on the panel rather than escaping.
        e.preventDefault();
        if (panelRef.current) panelRef.current.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose, closeOnEscape, getFocusable, advance]
  );

  // Close only when the backdrop itself is the mousedown target — so a text
  // selection that starts inside the panel and ends on the backdrop doesn't
  // dismiss the modal.
  const handleBackdropMouseDown = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget && onClose) onClose();
  };

  return (
    <div
      className={overlayClassName}
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={!labelledBy && title ? title : undefined}
        aria-labelledby={labelledBy || undefined}
        aria-describedby={describedBy || undefined}
        tabIndex={-1}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}
