import {
  School, Users, Building2, TrendingUp, IndianRupee, Image, Calendar,
  Download, RefreshCw, CheckCircle, AlertCircle,
} from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, SecondaryButton, FIELD_CLASS, CHECKBOX_CLASS,
} from '../../../components/admin/AdminUI';

/**
 * Placement Poster, at every width.
 *
 * Two jobs on one page: pick a college (or several) and see whether there is
 * anything worth putting on a poster. The page it replaces made those two look
 * equally important with four gradient stat cards; the figures are the point,
 * and whether the poster can be generated at all is the answer the page owes.
 */

/* --------------------------------------------------------------- readiness */

/**
 * Whether a poster can be made, said plainly.
 *
 * The generate button used to be enabled and then refuse with a toast. Saying
 * why up front is the same information, arriving before the click rather than
 * after it.
 */
function Readiness({ stats }) {
  const placed = stats?.total_students_placed || 0;
  const ready = placed > 0;
  return (
    <div className={`flex gap-2.5 p-3 rounded-spc-admin border
      ${ready ? 'bg-spc-ok-bg border-spc-ok/30' : 'bg-spc-warn-bg border-spc-warn/40'}`}>
      {ready
        ? <CheckCircle size={17} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
        : <AlertCircle size={17} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />}
      <p className="text-spc-xs text-spc-ink">
        {ready
          ? `Ready — ${placed} placed ${placed === 1 ? 'student' : 'students'} will appear on the poster.`
          : 'No students are recorded as placed for this college yet, so there is nothing to put on a poster.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ figures */

function StatTile({ label, value, icon: Icon, hint }) {
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
      <span className="w-9 h-9 rounded-spc-admin-sm bg-spc-accent-soft flex items-center justify-center">
        <Icon size={17} className="text-spc-accent" aria-hidden="true" />
      </span>
      <p className="text-spc-metric font-bold text-spc-ink tabular-nums mt-2.5">{value}</p>
      <p className="text-spc-sm font-bold text-spc-ink mt-0.5">{label}</p>
      {hint && <p className="text-spc-xs text-spc-body mt-0.5">{hint}</p>}
    </div>
  );
}

/** A fact about the college that the poster will carry. */
function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 border-b border-spc-line last:border-b-0">
      <Icon size={16} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{label}</p>
        <p className="text-spc-sm text-spc-ink break-words">{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- selection */

function SingleCollegePicker({ colleges, value, onChange, disabled }) {
  return (
    <div>
      <label htmlFor="poster-college" className="block text-spc-label font-bold uppercase text-spc-body mb-1.5">
        College
      </label>
      <select
        id="poster-college"
        className={FIELD_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Choose a college…</option>
        {colleges.map((college) => (
          <option key={college.id} value={college.id}>{college.college_name}</option>
        ))}
      </select>
    </div>
  );
}

function MultiCollegePicker({ colleges, selected, onToggle, onSelectAll, disabled }) {
  const allSelected = colleges.length > 0 && selected.length === colleges.length;
  return (
    <Panel className="overflow-hidden">
      <PanelHeading
        action={(
          <SecondaryButton onClick={onSelectAll} disabled={disabled}>
            {allSelected ? 'Clear all' : 'Select all'}
          </SecondaryButton>
        )}
      >
        {selected.length} of {colleges.length} chosen
      </PanelHeading>
      <div className="max-h-96 overflow-y-auto divide-y divide-spc-line">
        {colleges.map((college) => {
          const checked = selected.includes(college.id);
          return (
            <label
              key={college.id}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                ${checked ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(college.id)}
                disabled={disabled}
                className={CHECKBOX_CLASS}
              />
              <span className="text-spc-sm text-spc-ink min-w-0 break-words">{college.college_name}</span>
            </label>
          );
        })}
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------------- body */

export default function PosterBody(p) {
  const { layout, stats, multiSelectMode } = p;
  const statColumns = layout === 'desktop' ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const canGenerate = multiSelectMode
    ? p.selectedColleges.length > 0
    : Boolean(stats && stats.total_students_placed > 0);

  return (
    <div>
      <PageHeading
        eyebrow="Jobs"
        title="Placement Poster"
        subline="A PDF of who was placed, and where"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <SecondaryButton onClick={p.onToggleMode} disabled={p.generating}>
          <School size={15} aria-hidden="true" />
          {multiSelectMode ? 'One college' : 'Several colleges'}
        </SecondaryButton>
      </PageHeading>

      <section className="mb-5">
        <SectionLabel>{multiSelectMode ? 'Colleges to include' : 'Which college'}</SectionLabel>
        {multiSelectMode ? (
          <MultiCollegePicker
            colleges={p.colleges}
            selected={p.selectedColleges}
            onToggle={p.onToggleCollege}
            onSelectAll={p.onSelectAll}
            disabled={p.generating}
          />
        ) : (
          <SingleCollegePicker
            colleges={p.colleges}
            value={p.selectedCollege}
            onChange={p.onSelectCollege}
            disabled={p.generating}
          />
        )}
      </section>

      {/* The figures only exist for a single college — the multi-college poster
          is generated from the server's own aggregate. */}
      {!multiSelectMode && p.selectedCollege && (
        <>
          {p.loadingStats ? (
            <Panel><EmptyState>Loading this college's placement figures…</EmptyState></Panel>
          ) : stats ? (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <SectionLabel className="mb-0">
                  {stats.college_name} · {stats.placement_year_start}–{stats.placement_year_end}
                </SectionLabel>
                <SecondaryButton onClick={p.onRefreshStats} disabled={p.generating}>
                  <RefreshCw size={15} aria-hidden="true" />
                  Refresh
                </SecondaryButton>
              </div>

              <div className={`grid grid-cols-2 ${statColumns} gap-3 mb-4`}>
                <StatTile
                  label="Students placed"
                  value={stats.total_students_placed || 0}
                  icon={Users}
                  hint="On the poster"
                />
                <StatTile
                  label="Companies"
                  value={stats.recruiting_companies || stats.total_companies || 0}
                  icon={Building2}
                  hint={stats.total_companies ? `${stats.total_companies} placed` : 'Recruiting'}
                />
                <StatTile
                  label="Highest package"
                  value={stats.highest_package ? `${stats.highest_package} LPA` : '—'}
                  icon={TrendingUp}
                  hint="Best offer received"
                />
                <StatTile
                  label="Average package"
                  value={stats.average_package ? `${stats.average_package} LPA` : '—'}
                  icon={IndianRupee}
                  hint="Mean package"
                />
              </div>

              <div className="mb-4">
                <Readiness stats={stats} />
              </div>

              <section className="mb-5">
                <SectionLabel>What the poster carries</SectionLabel>
                <Panel className="overflow-hidden">
                  <Fact
                    icon={Image}
                    label="College logo"
                    value={stats.college_logo_url ? 'Uploaded' : 'None — the poster runs without one'}
                  />
                  <Fact
                    icon={Calendar}
                    label="Placement year"
                    value={`${stats.placement_year_start}–${stats.placement_year_end}`}
                  />
                </Panel>
              </section>

              {stats.company_breakdown && stats.company_breakdown.length > 0 && (
                <section className="mb-5">
                  <SectionLabel>Companies and who they took</SectionLabel>
                  <Panel className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <caption className="sr-only">
                          Each recruiting company, its package and how many students it placed.
                        </caption>
                        <thead>
                          <tr className="bg-spc-surface-2 border-b border-spc-line">
                            {['Company', 'Package', 'Students placed'].map((heading) => (
                              <th
                                key={heading}
                                scope="col"
                                className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                                  text-spc-body text-left px-4 py-2"
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stats.company_breakdown.map((company) => (
                            <tr
                              key={`${company.company_name}-${company.lpa}`}
                              className="border-b border-spc-line last:border-b-0"
                            >
                              <th scope="row" className="px-4 py-2.5 text-left text-spc-sm text-spc-ink font-normal">
                                {company.company_name}
                              </th>
                              <td className="px-4 py-2.5 text-spc-xs text-spc-body tabular-nums">
                                {company.lpa ? `${company.lpa} LPA` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-spc-xs text-spc-ink tabular-nums">
                                {company.student_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </section>
              )}
            </>
          ) : (
            <Panel><EmptyState>No placement data for this college.</EmptyState></Panel>
          )}
        </>
      )}

      <PrimaryButton
        onClick={p.onGenerate}
        disabled={p.generating || !canGenerate}
        className="w-full"
      >
        <Download size={15} aria-hidden="true" />
        {p.generating
          ? 'Generating…'
          : multiSelectMode
            ? `Generate for ${p.selectedColleges.length} ${p.selectedColleges.length === 1 ? 'college' : 'colleges'}`
            : 'Generate poster'}
      </PrimaryButton>
    </div>
  );
}
