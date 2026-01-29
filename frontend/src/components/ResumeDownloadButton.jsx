import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ResumeDownloadButton Component
 *
 * A button for downloading a student's resume PDF
 * Used by placement officers and super admins
 *
 * @param {number} studentId - The student ID
 * @param {string} studentName - Student name for filename
 * @param {object} api - API object (placementOfficerAPI or superAdminAPI)
 */
export default function ResumeDownloadButton({ studentId, studentName, api }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);

    try {
      const response = await api.downloadStudentResume(studentId);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = studentName?.replace(/[^a-zA-Z0-9]/g, '_') || `Student_${studentId}`;
      link.download = `Resume_${safeName}.pdf`;
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
    <button
      onClick={handleDownload}
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
          <Download size={16} />
          <span>Download Resume</span>
        </>
      )}
    </button>
  );
}
