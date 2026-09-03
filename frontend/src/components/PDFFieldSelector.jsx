import { useState } from 'react';
import { FileText, X, Check, PenLine, Building2 } from 'lucide-react';
import Modal from './Modal';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogFooter, OfficerToggleRow,
} from './officer/OfficerDialog';
import {
  PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
} from './officer/OfficerUI';
import {
  ADMIN_OVERLAY, AdminDialogFooter, AdminDialogHeader, AdminToggleRow, adminPanel,
} from './admin/AdminDialog';
import {
  CHECKBOX_CLASS as Admin_CHECKBOX_CLASS, FIELD_CLASS as Admin_FIELD_CLASS, FieldLabel as Admin_FieldLabel, PrimaryButton as Admin_PrimaryButton, SecondaryButton as Admin_SecondaryButton,
} from './admin/AdminUI';

/**
 * Choose what goes into the exported PDF.
 *
 * `variant="officer"` renders the Register treatment; every other caller keeps
 * the original markup verbatim. The officer branch fixes two things beyond the
 * styling, both of which the original could not do:
 *
 *   - the field chooser was 21 buttons that toggled a selection but announced
 *     themselves as plain buttons. They are real checkboxes now, so the state
 *     is readable and Space works.
 *   - the signature control was a painted sliding pill with no input behind
 *     it — unreachable by keyboard, announced as nothing.
 *
 * The two `alert()` calls become inline messages beside the thing that is
 * wrong, rather than a browser dialog that says it somewhere else.
 */

/*
 * The officer and Console dialog primitives, chosen by variant.
 *
 * Both roles run on the same spc tokens, so the markup is identical — but
 * the radii are fixed values in tailwind.config.js rather than
 * scope-overridden custom properties, so the officer's 3px corners do not
 * become Console's 12px on their own. Picking the set here is what keeps one
 * copy of the markup honest for both.
 */
const OFFICER_UI = {
  overlay: OFFICER_OVERLAY,
  panel: officerPanel,
  Header: OfficerDialogHeader,
  Footer: OfficerDialogFooter,
  Toggle: OfficerToggleRow,
  Primary: PrimaryButton,
  Secondary: SecondaryButton,
  Label: FieldLabel,
  field: FIELD_CLASS,
  checkbox: CHECKBOX_CLASS,
};

const ADMIN_UI = {
  overlay: ADMIN_OVERLAY,
  panel: adminPanel,
  Header: AdminDialogHeader,
  Footer: AdminDialogFooter,
  Toggle: AdminToggleRow,
  Primary: Admin_PrimaryButton,
  Secondary: Admin_SecondaryButton,
  Label: Admin_FieldLabel,
  field: Admin_FIELD_CLASS,
  checkbox: Admin_CHECKBOX_CLASS,
};

const PDFFieldSelector = ({ onExport, onClose, applicantCount, exportType = 'enhanced', variant, customFields = [] }) => {
  const [headerLine1, setHeaderLine1] = useState('');
  const [headerLine2, setHeaderLine2] = useState('');
  const [selectedFields, setSelectedFields] = useState([
    'prn',
    'student_name',
    'branch',
    'programme_cgpa',
    'application_status'
  ]);
  const [includeSignature, setIncludeSignature] = useState(true);

  /*
   * The job's own questions, offered beside the fixed fields.
   *
   * These differ from one job to the next — that is what they are for — so they
   * come from the job rather than being listed here. The keys are prefixed to
   * match what the export writes onto each applicant row: a custom field named
   * "branch" would otherwise collide with the real branch column.
   */
  const customOptions = (customFields || [])
    .filter((f) => f && f.field_name)
    .map((f) => ({ key: `custom_${f.field_name}`, label: f.field_label || f.field_name }));

  const availableFields = [
    { key: 'prn', label: 'PRN' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'college_name', label: 'College' },
    { key: 'region_name', label: 'Region' },
    { key: 'branch', label: 'Branch' },
    { key: 'programme_cgpa', label: 'CGPA' },
    { key: 'backlog_count', label: 'Backlogs' },
    { key: 'application_status', label: 'Status' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'date_of_birth', label: 'DOB' },
    { key: 'gender', label: 'Gender' },
    { key: 'sslc_marks', label: 'SSLC %' },
    { key: 'twelfth_marks', label: '12th %' },
    { key: 'district', label: 'District' },
    { key: 'has_passport', label: 'Passport' },
    { key: 'has_aadhar_card', label: 'Aadhar' },
    { key: 'has_driving_license', label: 'Driving License' },
    { key: 'has_pan_card', label: 'PAN Card' },
    { key: 'height_cm', label: 'Height (cm)' },
    { key: 'weight_kg', label: 'Weight (kg)' }
  ].concat(customOptions);

  const toggleField = (fieldKey) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const selectAll = () => {
    setSelectedFields(availableFields.map(f => f.key));
  };

  const selectNone = () => {
    setSelectedFields([]);
  };

  const handleExport = () => {
    if (!headerLine1.trim()) {
      alert('Please enter a title for the PDF header (Line 1)');
      return;
    }
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }
    onExport({
      fields: selectedFields,
      includeSignature,
      headerLine1: headerLine1.trim(),
      headerLine2: headerLine2.trim() || null,
    });
  };

  const headerColor = exportType === 'selected_only'
    ? 'bg-gradient-to-r from-green-600 to-emerald-600'
    : 'bg-gradient-to-r from-purple-600 to-indigo-600';

  if (variant === 'officer' || variant === 'admin') {
    const ui = variant === 'admin' ? ADMIN_UI : OFFICER_UI;
    const titleMissing = !headerLine1.trim();
    const noFields = selectedFields.length === 0;
    return (
      <Modal
        onClose={onClose}
        labelledBy="pdf-export-title"
        overlayClassName={ui.overlay}
        panelClassName={ui.panel('lg', { scroll: true })}
      >
        <ui.Header
          onClose={onClose}
          id="pdf-export-title"
          title={exportType === 'selected_only' ? 'Export selected students' : 'Export as PDF'}
          subtitle={
            exportType === 'selected_only'
              ? `${applicantCount} selected student${applicantCount !== 1 ? 's' : ''}`
              : `${applicantCount} applicant${applicantCount !== 1 ? 's' : ''}`
          }
        />

        <div className="flex-1 overflow-y-auto spc-scroll-contain">
          <section className="px-5 py-4 border-b border-spc-line">
            <h3 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-1">
              Heading printed on the PDF
            </h3>
            <p className="text-xs text-spc-muted mb-3">
              This is what appears at the top of every page of the document.
            </p>
            <div className="space-y-3">
              <div>
                <ui.Label htmlFor="pdf-header-1">Title</ui.Label>
                <input
                  id="pdf-header-1"
                  type="text"
                  value={headerLine1}
                  onChange={(e) => setHeaderLine1(e.target.value)}
                  placeholder="e.g. Cadence Design Systems, Bangalore 2026"
                  className={ui.field}
                  aria-invalid={titleMissing ? 'true' : undefined}
                />
                {titleMissing && (
                  <p className="text-xs text-spc-bad mt-1">
                    A title is required — the export will not run without it.
                  </p>
                )}
              </div>
              <div>
                <ui.Label htmlFor="pdf-header-2">Subtitle</ui.Label>
                <input
                  id="pdf-header-2"
                  type="text"
                  value={headerLine2}
                  onChange={(e) => setHeaderLine2(e.target.value)}
                  placeholder="e.g. Placement Drive at GPC Palakkad on 06-02-2026"
                  className={ui.field}
                />
                <p className="text-xs text-spc-muted mt-1">Optional.</p>
              </div>
            </div>
          </section>

          <section className="px-5 py-4 border-b border-spc-line">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <h3 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink">
                Columns
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-spc-muted tabular-nums">
                  {selectedFields.length} of {availableFields.length}
                </span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-bold text-spc-ink underline underline-offset-2 min-h-[44px] px-1 hover:text-spc-accent transition-colors"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs font-bold text-spc-ink underline underline-offset-2 min-h-[44px] px-1 hover:text-spc-accent transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
              {availableFields.map((field) => (
                <li key={field.key}>
                  <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className={ui.checkbox}
                    />
                    <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                      {field.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {noFields && (
              <p className="text-xs text-spc-bad mt-2">
                Pick at least one column, or there is nothing to export.
              </p>
            )}
          </section>

          <section className="px-5 py-4">
            <h3 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-1">
              Signature column
            </h3>
            <ui.Toggle
              checked={includeSignature}
              onChange={() => setIncludeSignature(!includeSignature)}
              label="Leave a blank column for signatures"
              hint="For printing and collecting signatures on the day."
            />
          </section>
        </div>

        <ui.Footer>
          <ui.Secondary type="button" onClick={onClose}>Cancel</ui.Secondary>
          <ui.Primary type="button" onClick={handleExport} disabled={noFields || titleMissing}>
            <FileText size={15} aria-hidden="true" />
            <span>Export PDF</span>
          </ui.Primary>
        </ui.Footer>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy="pdf-export-title"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      panelClassName="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
    >
        {/* Header */}
        <div className={`${headerColor} text-white p-6 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {exportType === 'selected_only' ? <Check size={24} /> : <FileText size={24} />}
            <div>
              <h2 id="pdf-export-title" className="text-xl font-bold">
                {exportType === 'selected_only' ? 'Export Selected Students Only' : 'Customize PDF Export'}
              </h2>
              <p className="text-sm opacity-90">
                {exportType === 'selected_only'
                  ? `Select fields to include (${applicantCount} selected student${applicantCount !== 1 ? 's' : ''})`
                  : `Select fields to include (${applicantCount} applicants)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* PDF Header Configuration */}
          <div className="p-6 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-amber-700" />
              <span className="font-semibold text-amber-900 text-sm">PDF Header</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Line 1 — Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={headerLine1}
                  onChange={e => setHeaderLine1(e.target.value)}
                  placeholder="e.g. Cadence Design Systems, Bangalore 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Line 2 — Subtitle <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={headerLine2}
                  onChange={e => setHeaderLine2(e.target.value)}
                  placeholder="e.g. Placement Drive at GPC Palakkad on 06-02-2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-indigo-600">{selectedFields.length}</span> of {availableFields.length} fields selected
            </div>
            <div className="flex space-x-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Field Selection Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableFields.map((field) => (
                <button
                  key={field.key}
                  onClick={() => toggleField(field.key)}
                  className={`p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                    selectedFields.includes(field.key)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-sm">{field.label}</span>
                  {selectedFields.includes(field.key) && (
                    <Check size={16} className="text-indigo-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Signature Toggle */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIncludeSignature(!includeSignature)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  includeSignature
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${includeSignature ? 'bg-amber-200' : 'bg-gray-100'}`}>
                    <PenLine size={18} className={includeSignature ? 'text-amber-700' : 'text-gray-500'} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm block">Include Signature Column</span>
                    <span className="text-xs text-gray-500">Adds an empty signature column for students to sign</span>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${includeSignature ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeSignature ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFields.length === 0 || !headerLine1.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FileText size={18} />
            <span>Export PDF</span>
          </button>
        </div>
    </Modal>
  );
};

export default PDFFieldSelector;
