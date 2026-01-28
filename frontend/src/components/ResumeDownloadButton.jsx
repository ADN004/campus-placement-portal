import { useState, useEffect } from 'react';
import { Download, FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ResumeDownloadButton Component
 *
 * A dropdown button for downloading student resumes (standard or custom version)
 * Used by placement officers and super admins
 *
 * @param {number} studentId - The student ID
 * @param {string} studentName - Student name for filename
 * @param {object} api - API object (placementOfficerAPI or superAdminAPI)
 */
export default function ResumeDownloadButton({ studentId, studentName, api }) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resumeStatus, setResumeStatus] = useState({
    hasCustomContent: false,
    lastModified: null,
    loading: true
  });

  useEffect(() => {
    fetchResumeStatus();
  }, [studentId]);

  const fetchResumeStatus = async () => {
    try {
      const response = await api.getStudentResumeStatus(studentId);
      setResumeStatus({
        hasCustomContent: response.data.data.hasCustomContent,
        lastModified: response.data.data.lastModified,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching resume status:', error);
      setResumeStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDownload = async (type) => {
    setDownloading(true);
    setIsOpen(false);

    try {
      const response = type === 'standard'
        ? await api.downloadStudentStandardResume(studentId)
        : await api.downloadStudentCustomResume(studentId);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = studentName?.replace(/[^a-zA-Z0-9]/g, '_') || `Student_${studentId}`;
      link.download = `Resume_${safeName}_${type === 'standard' ? 'Standard' : 'Custom'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded successfully!');
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={downloading}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm font-medium"
      >
        {downloading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <FileText size={16} />
            <span>Resume</span>
            <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && !downloading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase">Download Resume</p>
              {resumeStatus.hasCustomContent && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Student has customized their resume
                </p>
              )}
            </div>

            <div className="p-2">
              {/* Standard Version */}
              <button
                onClick={() => handleDownload('standard')}
                className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Download size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">Standard Version</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Clean professional layout using system data
                  </p>
                </div>
              </button>

              {/* Custom Version */}
              <button
                onClick={() => handleDownload('custom')}
                className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors text-left group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Download size={16} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm">Custom Version</p>
                    {resumeStatus.hasCustomContent && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                        Modified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Includes student's custom additions
                  </p>
                </div>
              </button>
            </div>

            {resumeStatus.lastModified && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last modified: {new Date(resumeStatus.lastModified).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
