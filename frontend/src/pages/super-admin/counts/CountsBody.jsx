import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, FIELD_CLASS, CHECKBOX_CLASS,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * How many students each college has, and how many in each branch.
 *
 * Asking that used to mean opening sixty colleges one at a time. The point of
 * the page is the number on screen *before* anything is downloaded: it comes
 * from the same endpoint that builds the files, so a figure you can check
 * against what you already know is worth more than a file that might be scoped
 * wrong.
 *
 * The per-college table is the same check at a finer grain, which is why it is
 * shown rather than left to the export.
 */

function Figure({ label, value, strong }) {
  return (
    <div className="min-w-[110px]">
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{label}</p>
      <p className={`tabular-nums font-bold text-spc-ink
        ${strong ? 'text-spc-metric' : 'text-spc-h2'}`}>
        {value}
      </p>
    </div>
  );
}

function CountsTable({ colleges }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">
            Registered student counts per college, with approved, pending and total.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {[
                ['College', 'text-left'],
                ['Region', 'text-left'],
                ['Approved', 'text-right'],
                ['Pending', 'text-right'],
                ['Total', 'text-right'],
              ].map(([heading, align]) => (
                <th key={heading} scope="col"
                  className={`font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body px-4 py-2.5 whitespace-nowrap ${align}`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colleges.map((c) => (
              <tr key={c.college_id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left text-spc-sm font-bold
                  text-spc-ink break-words">
                  {c.college_name}
                </th>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{c.region_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink text-right tabular-nums">
                  {c.approved}
                </td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink text-right tabular-nums">
                  {c.pending}
                </td>
                <td className="px-4 py-3 text-spc-sm font-bold text-spc-ink text-right tabular-nums">
                  {c.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CountsList({ colleges }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {colleges.map((c) => (
          <li key={c.college_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink break-words">{c.college_name}</p>
                <p className="text-spc-xs text-spc-body">{c.region_name}</p>
              </div>
              <p className="text-spc-h2 font-bold text-spc-ink tabular-nums flex-shrink-0">
                {c.total}
              </p>
            </div>
            <p className="text-spc-xs text-spc-body mt-1 tabular-nums">
              {c.approved} approved · {c.pending} pending
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function CountsBody(p) {
  const { layout, preview } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Reports"
        title="Student Counts"
        subline="Registered students per college, and per branch within each college"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <Panel className="p-4 mb-4 space-y-5">
        {/* ------------------------------------------------------- detail */}
        <fieldset>
          <legend className="font-khand text-spc-label font-medium uppercase tracking-[0.14em]
            text-spc-body mb-2">
            Level of detail
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['branch', 'College and branch', 'Each college, split by branch'],
              ['college', 'College totals only', 'One line per college'],
            ].map(([value, label, hint]) => (
              <label key={value}
                className={`flex items-start gap-3 p-3 rounded-spc-admin-sm border cursor-pointer
                  transition-colors ${p.detail === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}>
                <input
                  type="radio" name="detail" value={value}
                  checked={p.detail === value} onChange={() => p.onDetail(value)}
                  className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0`}
                />
                <span className="min-w-0">
                  <span className="block text-spc-sm font-bold text-spc-ink">{label}</span>
                  <span className="block text-spc-xs text-spc-body">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* -------------------------------------------------------- scope */}
        <fieldset>
          <legend className="font-khand text-spc-label font-medium uppercase tracking-[0.14em]
            text-spc-body mb-2">
            Which colleges
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              ['all', 'Every college'],
              ['college', 'One college'],
              ['region', 'By region'],
            ].map(([value, label]) => (
              <label key={value}
                className={`flex items-center gap-3 p-3 rounded-spc-admin-sm border cursor-pointer
                  transition-colors ${p.scope === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}>
                <input
                  type="radio" name="scope" value={value}
                  checked={p.scope === value} onChange={() => p.onScope(value)}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`}
                />
                <span className="text-spc-sm font-bold text-spc-ink">{label}</span>
              </label>
            ))}
          </div>

          {p.scope === 'college' && (
            <select
              id="counts-college"
              className={`${FIELD_CLASS} mt-3 max-w-md`}
              value={p.collegeId}
              onChange={(e) => p.onCollegeId(e.target.value)}
              aria-label="Which college"
            >
              <option value="">Choose a college…</option>
              {p.colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.college_name}</option>
              ))}
            </select>
          )}

          {p.scope === 'region' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1
              border border-spc-line-strong rounded-spc-admin-sm p-1">
              {p.regions.map((r) => (
                <label key={r.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-spc-admin-sm cursor-pointer
                    ${p.regionIds.includes(r.id) ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                  <input
                    type="checkbox"
                    checked={p.regionIds.includes(r.id)}
                    onChange={() => p.onToggleRegion(r.id)}
                    className={`${CHECKBOX_CLASS} flex-shrink-0`}
                  />
                  <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                    {r.region_name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {/* ------------------------------------------------------ the count */}
        <div className="pt-4 border-t border-spc-line">
          {p.loading ? (
            <p className="text-spc-sm text-spc-body flex items-center gap-2" aria-live="polite">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Counting…
            </p>
          ) : preview ? (
            <div aria-live="polite">
              <div className="flex flex-wrap gap-5">
                <Figure label="Colleges" value={preview.meta.collegeCount} />
                <Figure label="Approved" value={preview.meta.grand.approved} />
                <Figure label="Pending" value={preview.meta.grand.pending} />
                <Figure label="Total" value={preview.meta.grand.total} strong />
              </div>
              <p className="text-spc-xs text-spc-body mt-3">{preview.meta.basis}</p>
            </div>
          ) : (
            <p className="text-spc-sm text-spc-body">
              {p.scope === 'college'
                ? 'Choose a college to see the counts.'
                : 'Choose at least one region to see the counts.'}
            </p>
          )}
        </div>

        {/* ------------------------------------------------------ download */}
        <div className="pt-4 border-t border-spc-line">
          <SectionLabel>Take it away</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              onClick={() => p.onDownload('pdf')}
              disabled={!preview || Boolean(p.downloading)}
            >
              {p.downloading === 'pdf'
                ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                : <FileText size={15} aria-hidden="true" />}
              PDF
            </PrimaryButton>
            <SecondaryButton
              onClick={() => p.onDownload('excel')}
              disabled={!preview || Boolean(p.downloading)}
            >
              {p.downloading === 'excel'
                ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                : <FileSpreadsheet size={15} aria-hidden="true" />}
              Excel
            </SecondaryButton>
            {p.detail === 'branch' && (
              <p className="text-spc-xs text-spc-body">
                Excel gets one sheet per college, plus a summary.
              </p>
            )}
          </div>
        </div>
      </Panel>

      {preview && preview.colleges.length > 0 && (
        <>
          <SectionLabel>
            {preview.colleges.length} {preview.colleges.length === 1 ? 'college' : 'colleges'}
          </SectionLabel>
          {layout === 'desktop'
            ? <CountsTable colleges={preview.colleges} />
            : <CountsList colleges={preview.colleges} />}
        </>
      )}
    </div>
  );
}
