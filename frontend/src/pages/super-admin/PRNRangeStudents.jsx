import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Download, ArrowLeft, Users, CheckCircle, XCircle, FileSpreadsheet, FileText } from 'lucide-react';

export default function PRNRangeStudents() {
  const { rangeId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [rangeInfo, setRangeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const formatLabel = format === 'excel' ? 'Excel' : 'PDF';
      const response = await superAdminAPI.exportStudentsByPRNRange(rangeId, format);

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
      setShowExportDropdown(false);
    } catch (error) {
      toast.error(`Failed to export students as ${format}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const approvedCount = students.filter((s) => s.registration_status === 'approved').length;
  const pendingCount = students.filter((s) => s.registration_status === 'pending').length;
  const blacklistedCount = students.filter((s) => s.is_blacklisted).length;

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/super-admin/prn-ranges')}
          className="btn btn-secondary mb-4 flex items-center space-x-2"
        >
          <ArrowLeft size={18} />
          <span>Back to PRN Ranges</span>
        </button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students in PRN Range</h1>
            <p className="text-gray-600 mt-2">
              {rangeInfo?.type === 'single' ? (
                <>Single PRN: <span className="font-semibold">{rangeInfo.value}</span></>
              ) : (
                <>Range: <span className="font-semibold">{rangeInfo?.value}</span></>
              )}
            </p>
            {rangeInfo && !rangeInfo.is_enabled && (
              <p className="text-red-600 text-sm mt-1">⚠️ This range is currently disabled</p>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exporting || students.length === 0}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Download size={18} />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Export Dropdown */}
            {showExportDropdown && !exporting && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportDropdown(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors border-b border-gray-100"
                  >
                    <FileSpreadsheet size={18} className="text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Export as Excel</div>
                      <div className="text-xs text-gray-500">Spreadsheet format</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors rounded-b-lg"
                  >
                    <FileText size={18} className="text-red-600" />
                    <div>
                      <div className="font-medium text-gray-900">Export as PDF</div>
                      <div className="text-xs text-gray-500">Professional report format</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-blue-600">{students.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Users className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blacklisted</p>
              <p className="text-3xl font-bold text-red-600">{blacklistedCount}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">No students found in this PRN range</p>
          <p className="text-gray-500 text-sm mt-2">
            No students have registered with PRNs in this range yet
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>PRN</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>College</th>
                  <th>Region</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Status</th>
                  <th>Registered On</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.prn}>
                    <td className="font-mono">{student.prn}</td>
                    <td>{student.student_name}</td>
                    <td>{student.email}</td>
                    <td>{student.college_name}</td>
                    <td>{student.region_name}</td>
                    <td>{student.branch}</td>
                    <td>{student.programme_cgpa}</td>
                    <td>
                      {student.is_blacklisted ? (
                        <span className="badge bg-red-100 text-red-800">Blacklisted</span>
                      ) : (
                        <span
                          className={`badge ${
                            student.registration_status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : student.registration_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.registration_status}
                        </span>
                      )}
                    </td>
                    <td>{new Date(student.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
