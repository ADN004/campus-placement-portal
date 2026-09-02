import { useState } from 'react';

/**
 * Client-side paging over a list the page already holds in full.
 *
 * ManageStudents pages on the server, because it is reading every student in a
 * college and cannot hold them all. The applicant tables are the opposite case:
 * the whole list is already in memory and has to stay that way, because "select
 * all" means every applicant the filters match — not the fifty on screen — and
 * the exports and the header counts read the full set too. So the paging is
 * purely a matter of which slice is rendered.
 *
 * The same control sits on top of both (`components/officer/Pagination`), so an
 * officer sees one pager across the role and never has to know which is which.
 *
 * ---------------------------------------------------------------------------
 * On identity
 *
 * The page number is deliberately never reset from an effect watching `items`.
 * That is exactly what broke the window this replaces: the applicant page
 * rebuilds its arrays with `.filter()` on every render, so an effect depending
 * on the array fired every render and reset the position immediately.
 *
 * Instead the page is clamped during render, so a list that shrinks under the
 * current page simply lands on the last one, and `resetKey` gives the caller an
 * explicit say — pass the things that should send someone back to page one (the
 * job being viewed, the active filters) and nothing else. A background refresh
 * that leaves those alone leaves the officer where they were reading.
 */
export default function usePagedList(items, { pageSize = 50, resetKey = '' } = {}) {
  const list = items || [];
  const total = list.length;

  const [state, setState] = useState({ key: resetKey, page: 1, size: pageSize });

  // A new result set starts at the first page, whatever page the last one ended on.
  const size = state.key === resetKey ? state.size : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const requested = state.key === resetKey ? state.page : 1;

  // Clamped rather than corrected in an effect: the list can shrink between
  // renders, and a page past the end should show the last page, not blank.
  const page = Math.min(Math.max(1, requested), totalPages);
  const start = (page - 1) * size;

  return {
    page,
    pageSize: size,
    totalPages,
    total,
    visible: list.slice(start, start + size),
    first: total === 0 ? 0 : start + 1,
    last: Math.min(start + size, total),
    setPage: (next) => setState({ key: resetKey, page: next, size }),
    // Changing the page size keeps the first visible row in view rather than
    // throwing the reader back to the top of the list.
    setPageSize: (next) => setState({
      key: resetKey,
      page: Math.floor(start / next) + 1,
      size: next,
    }),
  };
}
