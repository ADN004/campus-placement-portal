import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import RangeStudentsBody from './prnRanges/RangeStudentsBody';
import RangeStudentsSkeleton from './prnRanges/RangeStudentsSkeleton';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import {
  PRN_RANGE_FIELD_OPTIONS, PRN_RANGE_DEFAULT_FIELDS,
} from '../../components/exportFieldOptions';

/**
 * Students in one PRN range — container.
 *
 * Behaviour unchanged: the same request, the same two export formats through
 * the same endpoint, the same filenames, the same toasts.
 *
 * The export dropdown became two buttons. There are exactly two formats, and a
 * menu to choose between two things is a click that buys nothing — so
 * `showExportDropdown` and its state went with it. Both exports do what they
 * always did.
 */
export default function PRNRangeStudents() {
  const { rangeId } = useParams();
  const deviceType = useDeviceType();
  const [students, setStudents] = useState([]);
  const [rangeInfo, setRangeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [rangeId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getStudentsByPRNRange(rangeId);
      setStudents(response.data.data || []);
      setRangeInfo(response.data.range);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  /*
   * The chooser, for the Excel export only. The PDF from this page has never
   * taken a field list and its column set is what the report is; adding one
   * there would be a second decision, not part of this one.
   */
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  const handleExport = async (format, fields) => {
    try {
      setExporting(true);
      const formatLabel = format === 'excel' ? 'Excel' : 'PDF';
      const response = await superAdminAPI.exportStudentsByPRNRange(rangeId, format, fields);

      // Create blob and download
      const mimeType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const extension = format === 'excel' ? 'xlsx' : 'pdf';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prn_range_students_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Students exported as ${formatLabel} successfully`);
    } catch (error) {
      toast.error(`Failed to export students as ${format}`);
    } finally {
      setExporting(false);
    }
  };

  if (showSkeleton) return <RangeStudentsSkeleton layout={deviceType} />;

  const approvedCount = students.filter((s) => s.registration_status === 'approved').length;
  const pendingCount = students.filter((s) => s.registration_status === 'pending').length;
  const blacklistedCount = students.filter((s) => s.is_blacklisted).length;

  return (
    <>
      <RangeStudentsBody
        layout={deviceType}
        students={students}
        rangeInfo={rangeInfo}
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        blacklistedCount={blacklistedCount}
        exporting={exporting}
        onExport={handleExport}
        onExportColumns={() => setShowFieldPicker(true)}
      />
      {showFieldPicker && (
        <PDFFieldSelector
          variant="admin"
          format="excel"
          applicantCount={students.length}
          fieldOptions={PRN_RANGE_FIELD_OPTIONS}
          defaultFields={PRN_RANGE_DEFAULT_FIELDS}
          onClose={() => setShowFieldPicker(false)}
          onExport={({ fields }) => {
            setShowFieldPicker(false);
            handleExport('excel', fields);
          }}
        />
      )}
    </>
  );
}
