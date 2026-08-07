import { useEffect } from 'react';

/**
 * Locks page (body) scroll while something is open over it, so the wheel only
 * moves that thing and never the content behind it.
 *
 * Locks are counted rather than each caller saving and restoring the value it
 * happened to find. Two locks overlapping is easy to arrange by accident — a
 * page holding its own lock while a dialog it renders holds another — and with
 * naive save/restore the inner lock records "hidden" as the value to put back,
 * so releasing it leaves the page locked forever. That is not a hypothetical:
 * it shipped on the officer's Manage Students page, where closing the student
 * dialog on a phone killed scrolling while the fixed sidebar and tab bar kept
 * working, which made it look as though scrolling itself had broken.
 *
 * With a count, the original value is captured once by the first lock and
 * restored once by the last release, so any amount of nesting is safe.
 */

let lockCount = 0;
let savedOverflow = null;

export default function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return undefined;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        // Back to the stylesheet's value, not a hardcoded 'auto'.
        document.body.style.overflow = savedOverflow ?? '';
        savedOverflow = null;
      }
    };
  }, [isOpen]);
}
