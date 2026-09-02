import { SecondaryButton, FIELD_CLASS } from './OfficerUI';

/**
 * The officer role's pager: a count of what is on screen, a rows-per-page
 * choice, and first / previous / last jumps.
 *
 * It lived inside the ManageStudents module until the applicant tables needed
 * the same thing. Nothing about it is specific to students, and two pagers that
 * drift apart is how a role stops feeling like one product — so it moved here
 * whole, unchanged, and ManageStudents re-exports it from its shared module so
 * its presenters keep importing from one place.
 *
 * Renders nothing at a single page: a pager under a list that fits is noise.
 *
 * Deliberately controlled — it owns no state. The caller holds the page, which
 * is what lets ManageStudents page on the server (`page` and `limit` go to the
 * API) while the applicant tables page in the browser over a list they already
 * hold in full. Same control, two very different mechanics behind it.
 */
export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = 'rows',
  /*
   * Tables take the default. A card grid passes its own, so every page fills
   * whole rows instead of leaving an orphan card in the last one.
   */
  sizes = [25, 50, 100, 200],
}) {
  if (totalPages <= 1) return null;
  const first = (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-spc-line">
      <p className="text-spc-xs text-spc-muted">
        Showing <span className="font-bold text-spc-ink tabular-nums">{first}</span>–
        <span className="font-bold text-spc-ink tabular-nums">{last}</span> of{' '}
        <span className="font-bold text-spc-ink tabular-nums">{total}</span>
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {/* The default sizes and the first/last jumps are exactly what the old
            pagination offered — same options, same destinations. */}
        <select
          value={pageSize}
          onChange={onPageSizeChange}
          aria-label={`${label} per page`}
          className={`${FIELD_CLASS} w-auto`}
        >
          {sizes.map((size) => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
        <SecondaryButton onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          First
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </SecondaryButton>
        <span className="text-spc-xs font-bold text-spc-ink tabular-nums px-1">
          {currentPage} / {totalPages}
        </span>
        <SecondaryButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </SecondaryButton>
      </div>
    </div>
  );
}
