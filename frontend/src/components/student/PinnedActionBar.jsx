import { useEffect } from 'react';

/**
 * A bottom-pinned action bar for a focused task — editing a profile or a resume.
 *
 * While it is mounted the student tab bar is hidden (see index.css). Two fixed
 * bars stacked at the bottom left a transparent strip between them that page
 * content scrolled through, which looked like a rendering fault. Offsetting one
 * above the other only moved the seam.
 *
 * Replacing navigation with the task's own actions is also the right behaviour:
 * tapping a tab mid-edit would discard unsaved changes without warning. Cancel
 * or Save brings the tabs straight back.
 */
export default function PinnedActionBar({ children }) {
  useEffect(() => {
    document.body.setAttribute('data-spc-actionbar', 'true');
    return () => document.body.removeAttribute('data-spc-actionbar');
  }, []);

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 px-4 pt-3 bg-spc-surface border-t border-spc-line"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </div>
  );
}
