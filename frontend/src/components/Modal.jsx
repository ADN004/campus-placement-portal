import { useEffect, useRef, useCallback } from 'react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

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
 *   initialFocusRef — optional ref to focus on open (else the first focusable).
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

  // On open: remember the trigger and move focus into the panel.
  // On close/unmount: restore focus to the trigger.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const target =
      (initialFocusRef && initialFocusRef.current) ||
      getFocusable()[0] ||
      panelRef.current;
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

  const handleKeyDown = useCallback(
    (e) => {
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
    [onClose, closeOnEscape, getFocusable]
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
