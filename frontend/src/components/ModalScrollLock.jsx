import useBodyScrollLock from '../hooks/useBodyScrollLock';

/**
 * Drop-in sentinel for modals that don't already manage it. Place it as the
 * first child inside a modal overlay: it mounts when the modal renders and
 * locks page scroll for exactly as long as the modal is open, then restores
 * it — so scrolling anywhere over the modal (card OR the dimmed backdrop)
 * never moves the page behind. Renders nothing.
 */
export default function ModalScrollLock() {
  useBodyScrollLock(true);
  return null;
}
