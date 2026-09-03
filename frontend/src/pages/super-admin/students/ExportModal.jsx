import { FileSpreadsheet, FileText, AlertTriangle, Download } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The custom export — who is in it, which columns, and in what format.
 *
 * Every field, option and limit is carried over unchanged, including the
 * twelve-column ceiling on PDF, which the backend enforces too. It is stated up
 * front here rather than only as a refusal after the click.
 *
 * One thing worth knowing, and now visible: **the page's own filters lead.** If
 * a region, college or branch is set on the page behind this dialog, that is
 * what gets exported and the matching control here is ignored. That was already
 * true and silent — the controls are disabled and labelled when it applies, so
 * nobody sets a college here and gets a different one in the file.
 */
export const EXPORT_FIELDS = [
  { label: 'PRN', value: 'prn' },
  { label: 'Student Name', value: 'student_name' },
  { label: 'Email', value: 'email' },
  { label: 'Mobile Number', value: 'mobile_number' },
  { label: 'Date of Birth', value: 'date_of_birth' },
  { label: 'Age', value: 'age' },
  { label: 'Gender', value: 'gender' },
  { label: 'Height (cm)', value: 'height' },
  { label: 'Weight (kg)', value: 'weight' },
  { label: 'Address', value: 'complete_address' },
  { label: 'Branch', value: 'branch' },
  { label: 'Semester 1 CGPA', value: 'cgpa_sem1' },
  { label: 'Semester 2 CGPA', value: 'cgpa_sem2' },
  { label: 'Semester 3 CGPA', value: 'cgpa_sem3' },
  { label: 'Semester 4 CGPA', value: 'cgpa_sem4' },
  { label: 'Semester 5 CGPA', value: 'cgpa_sem5' },
  { label: 'Semester 6 CGPA', value: 'cgpa_sem6' },
  { label: 'Programme CGPA', value: 'programme_cgpa' },
  { label: 'Backlog Count', value: 'backlog_count' },
  { label: 'Backlog Details', value: 'backlog_details' },
  { label: 'Driving License', value: 'has_driving_license' },
  { label: 'PAN Card', value: 'has_pan_card' },
  { label: 'College Name', value: 'college_name' },
  { label: 'Region Name', value: 'region_name' },
  { label: 'Registration Status', value: 'registration_status' },
  { label: 'Blacklist Status', value: 'is_blacklisted' },
];

/**
 * The same list as values.
 *
 * The old "Select all" compared the tick count against a hard-coded 25 while the
 * list it wrote held 26, so with everything ticked the button still read
 * "Select All". One list, one length, no drift.
 */
export const ALL_EXPORT_FIELDS = EXPORT_FIELDS.map((f) => f.value);

export const PDF_COLUMN_LIMIT = 12;

export default function ExportModal({
  layout,
  format, onFormat, fields, onToggleField, onSelectAll,
  pdfSettings, onPdfSetting, includePhotoUrl, onIncludePhotoUrl,
  useBranchShortNames, onUseBranchShortNames,
  exportFilters, onExportRegion, onExportCollege, onBranchToggle, onSelectAllBranches,
  regionsData, collegesData, availableBranches, fetchingBranches,
  pageRegion, pageCollege, pageBranch, archivedScope,
  onExport, onClose, processing,
}) {
  const tooManyForPdf = format === 'pdf' && fields.length > PDF_COLUMN_LIMIT;
  const allFieldsOn = fields.length === EXPORT_FIELDS.length;
  const allBranchesOn = availableBranches.length > 0
    && exportFilters.branches.length === availableBranches.length;
  const pageLeads = Boolean(pageRegion || pageCollege || pageBranch);
  const columns = layout === 'desktop' ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <Modal
      onClose={onClose}
      labelledBy="custom-export-title"
      panelClassName={adminPanel('xl', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="custom-export-title"
        title="Export students"
        subtitle={archivedScope
          ? 'Exporting a passed-out batch'
          : 'Choose who is in the file and which columns it carries'}
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        {/* ------------------------------------------------------------ who */}
        <div>
          <SectionLabel>Who is in it</SectionLabel>

          {pageLeads && (
            <div className="flex gap-2.5 p-3 mb-3 rounded-spc-admin bg-spc-surface-2
              border border-spc-line-strong">
              <AlertTriangle size={17} aria-hidden="true"
                className="text-spc-body flex-shrink-0 mt-0.5" />
              <p className="text-spc-xs text-spc-ink">
                The page&apos;s own filters lead this export
                {pageRegion && <> — region <span className="font-bold">{pageRegion}</span></>}
                {pageCollege && <>, college <span className="font-bold">{pageCollege}</span></>}
                {pageBranch && <>, branch <span className="font-bold">{pageBranch}</span></>}
                . Clear them on the page to choose here instead.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <FieldLabel htmlFor="export-region">Region</FieldLabel>
              <select
                id="export-region"
                className={FIELD_CLASS}
                value={exportFilters.region_id}
                onChange={(e) => onExportRegion(e.target.value)}
                disabled={Boolean(pageRegion)}
              >
                <option value="">{pageRegion || 'All regions'}</option>
                {regionsData.map((region) => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="export-college">College</FieldLabel>
              <select
                id="export-college"
                className={FIELD_CLASS}
                value={exportFilters.college_id}
                onChange={(e) => onExportCollege(e.target.value)}
                disabled={Boolean(pageCollege)}
              >
                <option value="">{pageCollege || 'All colleges'}</option>
                {collegesData.map((college) => (
                  <option key={college.id} value={college.id}>{college.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-2">
            {/* Not a <label>: it names a group of checkboxes, not one control. */}
            <p className="text-spc-label font-bold uppercase text-spc-body">
              Branches
              {exportFilters.college_id && !pageCollege && ' in that college'}
            </p>
            <SecondaryButton onClick={onSelectAllBranches} disabled={fetchingBranches || Boolean(pageBranch)}>
              {allBranchesOn ? 'Clear all' : 'Select all'}
            </SecondaryButton>
          </div>

          {pageBranch ? (
            <p className="text-spc-xs text-spc-body">
              Fixed to <span className="font-bold text-spc-ink">{pageBranch}</span> by the page filter.
            </p>
          ) : fetchingBranches ? (
            <p className="text-spc-xs text-spc-body px-1 py-3">Loading branches…</p>
          ) : (
            <>
              <div className={`grid grid-cols-1 ${columns} gap-1 max-h-40 overflow-y-auto
                border border-spc-line-strong rounded-spc-admin-sm p-1`}>
                {availableBranches.map((branch) => (
                  <label key={branch}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-spc-admin-sm cursor-pointer
                      ${exportFilters.branches.includes(branch)
                        ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                    <input
                      type="checkbox"
                      checked={exportFilters.branches.includes(branch)}
                      onChange={() => onBranchToggle(branch)}
                      className={`${CHECKBOX_CLASS} flex-shrink-0`}
                    />
                    <span className="text-spc-xs text-spc-ink min-w-0 break-words">{branch}</span>
                  </label>
                ))}
              </div>
              <p className="text-spc-xs text-spc-body mt-1.5">
                {exportFilters.branches.length === 0
                  ? 'None ticked — every branch is included.'
                  : `${exportFilters.branches.length} of ${availableBranches.length} ticked.`}
              </p>
            </>
          )}
        </div>

        {/* --------------------------------------------------------- format */}
        <div>
          <SectionLabel>Format</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['excel', 'Excel (.xlsx)', FileSpreadsheet, 'Every column you tick, no limit'],
              ['pdf', 'PDF (.pdf)', FileText, `Up to ${PDF_COLUMN_LIMIT} columns, printable`],
            ].map(([value, label, Icon, hint]) => (
              <label
                key={value}
                className={`flex flex-col gap-0.5 p-3 rounded-spc-admin-sm border cursor-pointer
                  transition-colors ${format === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="export-format" value={value}
                    checked={format === value} onChange={(e) => onFormat(e.target.value)}
                    className={CHECKBOX_CLASS} />
                  <Icon size={16} aria-hidden="true" className="text-spc-body" />
                  <span className="text-spc-sm font-bold text-spc-ink">{label}</span>
                </span>
                <span className="text-spc-xs text-spc-body pl-7">{hint}</span>
              </label>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------- columns */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <SectionLabel className="mb-0">
              Columns — {fields.length} of {EXPORT_FIELDS.length}
            </SectionLabel>
            <SecondaryButton onClick={onSelectAll}>
              {allFieldsOn ? 'Clear all' : 'Select all'}
            </SecondaryButton>
          </div>

          {tooManyForPdf && (
            <div className="flex gap-2.5 p-3 mb-2 rounded-spc-admin bg-spc-warn-bg
              border border-spc-warn/40">
              <AlertTriangle size={17} aria-hidden="true"
                className="text-spc-warn flex-shrink-0 mt-0.5" />
              <p className="text-spc-xs text-spc-ink font-semibold">
                A PDF fits {PDF_COLUMN_LIMIT} columns readably and {fields.length} are ticked.
                Untick some, or switch to Excel, which has no limit.
              </p>
            </div>
          )}

          <div className={`grid grid-cols-1 ${columns} gap-1 max-h-64 overflow-y-auto
            border border-spc-line-strong rounded-spc-admin-sm p-1`}>
            {EXPORT_FIELDS.map((field) => (
              <label key={field.value}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-spc-admin-sm cursor-pointer
                  ${fields.includes(field.value) ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                <input
                  type="checkbox"
                  checked={fields.includes(field.value)}
                  onChange={() => onToggleField(field.value)}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`}
                />
                <span className="text-spc-xs text-spc-ink min-w-0 break-words">{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------- format options */}
        {format === 'excel' ? (
          <div>
            <SectionLabel>Excel options</SectionLabel>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={includePhotoUrl}
                  onChange={(e) => onIncludePhotoUrl(e.target.checked)}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`} />
                <span className="text-spc-sm text-spc-ink">
                  A link to each student&apos;s photograph
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={useBranchShortNames}
                  onChange={(e) => onUseBranchShortNames(e.target.checked)}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`} />
                <span className="text-spc-sm text-spc-ink">
                  Short branch codes (CE, ME, CSE) with a reference sheet
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div>
            <SectionLabel>PDF options</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel htmlFor="pdf-company">Company name</FieldLabel>
                <input id="pdf-company" type="text" className={FIELD_CLASS}
                  value={pdfSettings.companyName}
                  onChange={(e) => onPdfSetting('companyName', e.target.value)}
                  placeholder="Printed in the header" />
              </div>
              <div>
                <FieldLabel htmlFor="pdf-date">Placement drive date</FieldLabel>
                <input id="pdf-date" type="date" className={FIELD_CLASS}
                  value={pdfSettings.driveDate}
                  onChange={(e) => onPdfSetting('driveDate', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['includeSignature', 'A signature column at the end'],
                ['separateColleges', 'Start each college on its own page'],
                ['useBranchShortNames', 'Short branch codes (CE, ME, CSE) with a reference page'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={pdfSettings[key]}
                    onChange={(e) => onPdfSetting(key, e.target.checked)}
                    className={`${CHECKBOX_CLASS} flex-shrink-0`} />
                  <span className="text-spc-sm text-spc-ink">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onExport} disabled={processing || fields.length === 0}>
          <Download size={15} aria-hidden="true" />
          {processing ? 'Exporting…' : `Export ${format === 'pdf' ? 'PDF' : 'Excel'}`}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}
