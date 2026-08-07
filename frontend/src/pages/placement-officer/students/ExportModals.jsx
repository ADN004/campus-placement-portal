import Modal from '../../../components/Modal';
import { Download } from 'lucide-react';
import { PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS } from './studentsShared';
import { OfficerDialogClose } from '../../../components/officer/OfficerDialog';

/**
 * The three export configuration dialogs: Excel, PDF and Custom.
 *
 * Same three destinations and the same settings as before — every checkbox and
 * field is bound to the container state the export handlers already read, so
 * the payloads sent to the API are unchanged.
 *
 * Split out from StudentModals because these are configuration forms rather
 * than record dialogs, and the custom one is by far the largest thing on the
 * page.
 */

const PANEL = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md';
const PANEL_TALL =
  'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

/** The 19 exportable fields, in the order the old modal listed them. */
export const EXPORT_FIELDS = [
  { label: 'PRN', value: 'prn' },
  { label: 'Student name', value: 'student_name' },
  { label: 'Email', value: 'email' },
  { label: 'Mobile number', value: 'mobile_number' },
  { label: 'Date of birth', value: 'date_of_birth' },
  { label: 'Age', value: 'age' },
  { label: 'Gender', value: 'gender' },
  { label: 'Branch', value: 'branch' },
  { label: 'Programme CGPA', value: 'programme_cgpa' },
  { label: 'Semester 1 CGPA', value: 'cgpa_sem1' },
  { label: 'Semester 2 CGPA', value: 'cgpa_sem2' },
  { label: 'Semester 3 CGPA', value: 'cgpa_sem3' },
  { label: 'Semester 4 CGPA', value: 'cgpa_sem4' },
  { label: 'Semester 5 CGPA', value: 'cgpa_sem5' },
  { label: 'Semester 6 CGPA', value: 'cgpa_sem6' },
  { label: 'Backlog count', value: 'backlog_count' },
  { label: 'Driving licence', value: 'has_driving_license' },
  { label: 'PAN card', value: 'has_pan_card' },
  { label: 'Registration status', value: 'registration_status' },
];

function Dialog({ id, title, onClose, children, tall = false }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy={id}
      panelClassName={tall ? PANEL_TALL : PANEL}
      overlayClassName={OVERLAY}
      closeOnBackdrop
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
        <div className="min-w-0">
          <h2 id={id} className="text-spc-h2 font-bold text-spc-ink">{title}</h2>
        </div>
        <OfficerDialogClose onClose={onClose} />
      </div>
      {children}
    </Modal>
  );
}

function Footer({ children }) {
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line flex-shrink-0">
      {children}
    </div>
  );
}

const CHECKBOX = 'w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))] flex-shrink-0';

/** A checkbox row with a real 44px target. */
function CheckRow({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className={`${CHECKBOX} mt-0.5`} />
      <span className="text-spc-xs text-spc-body">{children}</span>
    </label>
  );
}

export default function ExportModals({
  // excel
  showExcelConfigModal, useBranchShortNames, onUseBranchShortNamesChange,
  exporting, onExcelExport, onCloseExcel,
  // pdf
  showPdfConfigModal, pdfCompanyName, onPdfCompanyNameChange,
  pdfDriveDate, onPdfDriveDateChange,
  pdfIncludeSignature, onPdfIncludeSignatureChange,
  pdfSeparateColleges, onPdfSeparateCollegesChange,
  onPdfExport, onClosePdf,
  // custom
  showCustomExportModal, exportFormat, onExportFormatChange,
  exportFields, onFieldToggle, onSelectAllFields,
  exportBranches, onExportBranchesChange, collegeBranches,
  includePhotoUrl, onIncludePhotoUrlChange,
  customExportSettings, onCustomSettingChange,
  processing, onCustomExport, onCloseCustom,
}) {
  return (
    <>
      {/* ------------------------------------------------------------ excel */}
      {showExcelConfigModal && (
        <Dialog id="excel-export-title" title="Excel export settings" onClose={onCloseExcel}>
          <div className="px-5 py-4">
            <CheckRow checked={useBranchShortNames} onChange={onUseBranchShortNamesChange}>
              Use branch short names (CE, ME, CSE instead of full names)
            </CheckRow>
          </div>
          <Footer>
            <SecondaryButton onClick={onCloseExcel}>Cancel</SecondaryButton>
            <PrimaryButton onClick={onExcelExport} disabled={exporting}>
              <Download size={15} aria-hidden="true" />
              <span>{exporting ? 'Exporting…' : 'Export to Excel'}</span>
            </PrimaryButton>
          </Footer>
        </Dialog>
      )}

      {/* -------------------------------------------------------------- pdf */}
      {showPdfConfigModal && (
        <Dialog id="pdf-export-title" title="PDF export settings" onClose={onClosePdf}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <FieldLabel htmlFor="pdf-company">Company name (optional)</FieldLabel>
              <input
                id="pdf-company"
                type="text"
                value={pdfCompanyName}
                onChange={onPdfCompanyNameChange}
                placeholder="e.g. TNSER Technology Solutions (P) Ltd"
                className={FIELD_CLASS}
              />
              <p className="text-xs text-spc-muted mt-1">
                Leave empty for data-collection exports.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="pdf-drive-date">Placement drive date (optional)</FieldLabel>
              <input
                id="pdf-drive-date"
                type="date"
                value={pdfDriveDate}
                onChange={onPdfDriveDateChange}
                className={FIELD_CLASS}
              />
            </div>

            <div className="border-t border-spc-line pt-2">
              <CheckRow checked={pdfIncludeSignature} onChange={onPdfIncludeSignatureChange}>
                Include a signature column
              </CheckRow>
              <CheckRow checked={pdfSeparateColleges} onChange={onPdfSeparateCollegesChange}>
                Start each college on a new page
              </CheckRow>
              <CheckRow checked={useBranchShortNames} onChange={onUseBranchShortNamesChange}>
                Use branch short names (CE, ME, CSE)
              </CheckRow>
            </div>
          </div>
          <Footer>
            <SecondaryButton onClick={onClosePdf}>Cancel</SecondaryButton>
            <PrimaryButton onClick={onPdfExport} disabled={exporting}>
              <Download size={15} aria-hidden="true" />
              <span>{exporting ? 'Exporting…' : 'Export to PDF'}</span>
            </PrimaryButton>
          </Footer>
        </Dialog>
      )}

      {/* ----------------------------------------------------------- custom */}
      {showCustomExportModal && (
        <Dialog id="custom-export-title" title="Custom export" onClose={onCloseCustom} tall>
          <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 space-y-5">
            {/* format */}
            <fieldset>
              <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
                Format
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'excel', label: 'Excel (.xlsx)' },
                  { value: 'pdf', label: 'PDF (.pdf)' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 min-h-[44px] px-3 rounded-spc-control
                      border cursor-pointer transition-colors
                      ${exportFormat === option.value
                        ? 'border-spc-accent bg-spc-accent-soft'
                        : 'border-spc-control hover:bg-spc-surface-2'}`}
                  >
                    <input
                      type="radio"
                      name="export-format"
                      value={option.value}
                      checked={exportFormat === option.value}
                      onChange={onExportFormatChange}
                      className={CHECKBOX}
                    />
                    <span className="text-spc-xs font-bold text-spc-ink">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* pdf-only settings */}
            {exportFormat === 'pdf' && (
              <fieldset className="border border-spc-line rounded-spc-control p-3">
                <legend className="px-1 text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                  PDF settings
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="custom-company">Company name</FieldLabel>
                    <input
                      id="custom-company"
                      type="text"
                      value={customExportSettings.companyName}
                      onChange={(e) => onCustomSettingChange('companyName', e.target.value)}
                      placeholder="e.g. TNSER Technology Solutions"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="custom-drive-date">Drive date</FieldLabel>
                    <input
                      id="custom-drive-date"
                      type="date"
                      value={customExportSettings.driveDate}
                      onChange={(e) => onCustomSettingChange('driveDate', e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
                <CheckRow
                  checked={customExportSettings.includeSignature}
                  onChange={(e) => onCustomSettingChange('includeSignature', e.target.checked)}
                >
                  Include a signature column
                </CheckRow>
                <CheckRow
                  checked={customExportSettings.useBranchShortNames}
                  onChange={(e) => onCustomSettingChange('useBranchShortNames', e.target.checked)}
                >
                  Use branch short names (CE, ME, CSE)
                </CheckRow>
              </fieldset>
            )}

            {/* branches */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                  Filter by branch (optional)
                </p>
                <SecondaryButton
                  className="min-h-[36px] px-2"
                  onClick={() =>
                    onExportBranchesChange(
                      exportBranches.length === collegeBranches.length ? [] : [...collegeBranches]
                    )
                  }
                >
                  {exportBranches.length === collegeBranches.length ? 'Deselect all' : 'Select all'}
                </SecondaryButton>
              </div>
              <div className="grid grid-cols-2 gap-x-3 max-h-40 overflow-y-auto spc-scroll-contain
                border border-spc-line rounded-spc-control px-3">
                {collegeBranches.map((branch) => (
                  <label
                    key={branch}
                    className="flex items-center gap-2 min-h-[40px] cursor-pointer min-w-0"
                  >
                    <input
                      type="checkbox"
                      checked={exportBranches.includes(branch)}
                      onChange={(e) =>
                        onExportBranchesChange(
                          e.target.checked
                            ? [...exportBranches, branch]
                            : exportBranches.filter((b) => b !== branch)
                        )
                      }
                      className={CHECKBOX}
                    />
                    <span className="text-xs text-spc-body truncate">{branch}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-spc-muted mt-1">
                {exportBranches.length > 0
                  ? `${exportBranches.length} branch(es) selected`
                  : 'All branches will be included'}
              </p>
            </div>

            {/* fields */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                  Fields to export
                </p>
                <SecondaryButton className="min-h-[36px] px-2" onClick={onSelectAllFields}>
                  {exportFields.length === EXPORT_FIELDS.length ? 'Deselect all' : 'Select all'}
                </SecondaryButton>
              </div>
              <div className="grid grid-cols-2 gap-x-3 max-h-52 overflow-y-auto spc-scroll-contain
                border border-spc-line rounded-spc-control px-3">
                {EXPORT_FIELDS.map((field) => (
                  <label
                    key={field.value}
                    className="flex items-center gap-2 min-h-[40px] cursor-pointer min-w-0"
                  >
                    <input
                      type="checkbox"
                      checked={exportFields.includes(field.value)}
                      onChange={() => onFieldToggle(field.value)}
                      className={CHECKBOX}
                    />
                    <span className="text-xs text-spc-body truncate">{field.label}</span>
                  </label>
                ))}
              </div>
              {/* The 12-column ceiling is enforced by the handler and the
                  backend; warning here means you find out before you click. */}
              <p
                className={`text-xs mt-1 ${
                  exportFormat === 'pdf' && exportFields.length > 12
                    ? 'text-spc-bad font-bold'
                    : 'text-spc-muted'
                }`}
              >
                <span className="tabular-nums">{exportFields.length}</span> field(s) selected
                {exportFormat === 'pdf' && ' — a PDF fits up to 12 columns readably; use Excel for more'}
              </p>
            </div>

            {/* excel-only */}
            {exportFormat === 'excel' && (
              <div className="border-t border-spc-line pt-2">
                <CheckRow checked={includePhotoUrl} onChange={onIncludePhotoUrlChange}>
                  Include student photo URLs
                </CheckRow>
                <CheckRow
                  checked={customExportSettings.useBranchShortNames}
                  onChange={(e) => onCustomSettingChange('useBranchShortNames', e.target.checked)}
                >
                  Use branch short names (CE, ME, CSE)
                </CheckRow>
              </div>
            )}
          </div>

          <Footer>
            <SecondaryButton onClick={onCloseCustom} disabled={processing}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={onCustomExport}
              disabled={processing || exportFields.length === 0}
            >
              <Download size={15} aria-hidden="true" />
              <span>
                {processing ? 'Exporting…' : `Export ${exportFormat === 'pdf' ? 'PDF' : 'Excel'}`}
              </span>
            </PrimaryButton>
          </Footer>
        </Dialog>
      )}
    </>
  );
}
