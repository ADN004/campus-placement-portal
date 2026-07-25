import { useEffect } from 'react';

/**
 * Locks page (body) scroll while a modal is open, so the mouse wheel only
 * moves the modal and never the content behind it. Restores the previous
 * value on close. Pass the modal's open boolean.
 */
export default function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}
