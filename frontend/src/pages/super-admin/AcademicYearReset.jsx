import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ArrowLeft,
  Lock,
  Trash2,
  Briefcase,
  Bell,
  Users,
  FileText,
  Camera,
  ClipboardList,
  Activity,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import useSkeleton from '../../hooks/useSkeleton';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import { useNavigate } from 'react-router-dom';

export default function AcademicYearReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const { showSkeleton } = useSkeleton(loadingPreview);
  const [academicYear, setAcademicYear] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchPreview();
    const now = new Date();
    const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    const nextYear = (year + 1).toString().slice(-2);
    setAcademicYear(`${year}-${nextYear}`);
  }, []);

  const fetchPreview = async () => {
    try {
      const response = await superAdminAPI.getResetPreview();
      setPreview(response.data.data);
    } catch (error) {
      toast.error('Failed to load reset preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecute = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    const toastId = toast.loading('Executing academic year reset... This may take a moment.');
    setExecuting(true);

    try {
      const response = await superAdminAPI.performAcademicYearReset({
        academic_year: academicYear,
        password,
      });
      toast.success('Academic year reset completed successfully!', { id: toastId });
      setResult(response.data.data);
      setStep('complete');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed. All changes have been rolled back.', { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  const totalDataItems = preview
    ? preview.jobs + preview.job_applications + preview.job_requests +
      preview.notifications + preview.admin_notifications + preview.activity_logs +
      preview.whitelist_requests + preview.deleted_jobs_history
    : 0;

  const isNothingToReset = preview && totalDataItems === 0 && preview.active_prn_ranges === 0 && preview.student_photos === 0;

  if (showSkeleton) return <TablePageSkeleton statCards={0} tableColumns={4} tableRows={6} hasSearch={false} hasFilters={false} />;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-600 to-orange-600 rounded-2xl shadow-2xl mb-8 p-8">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <RotateCcw className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Academic Year Reset
              </h1>
              <p className="text-red-100 text-lg">
                Reset the system for a new academic year while preserving student records
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Step Indicator */}
      {step !== 'complete' && (
        <AnimatedSection delay={0.08}>
          <div className="flex items-center justify-center mb-8 space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step === s ? 'bg-red-600 text-white scale-110 shadow-lg' :
                  step > s ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                    step > s ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mb-8">
            <p className="text-sm text-gray-500">
              {step === 1 && 'Step 1: Review what will be reset'}
              {step === 2 && 'Step 2: Type confirmation text'}
              {step === 3 && 'Step 3: Verify your identity'}
            </p>
          </div>
        </AnimatedSection>
      )}

      {/* Step 1: Preview */}
      {step === 1 && preview && (
        <AnimatedSection delay={0.16}>
          {/* Warning Banner */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={28} />
              <div>
                <h3 className="text-lg font-bold text-red-800 mb-1">Irreversible Action</h3>
                <p className="text-red-700">
                  This will permanently delete all transactional data and disable all student logins.
                  Student records and PRN ranges will be preserved for historical access.
                  This action <strong>cannot be undone</strong>.
                </p>
              </div>
            </div>
          </div>

          {isNothingToReset && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-blue-600" size={24} />
                <p className="text-blue-800 font-medium">
                  The system appears to be already clean. There is no data to reset.
                </p>
              </div>
            </div>
          )}

          {/* Data to be WIPED */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Trash2 className="text-red-500" size={20} />
              <span>Data that will be permanently deleted</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataCard icon={Briefcase} label="Jobs" count={preview.jobs} color="red" />
              <DataCard icon={FileText} label="Job Applications" count={preview.job_applications} color="red" />
              <DataCard icon={Briefcase} label="Job Drives" count={preview.job_drives} color="red" />
              <DataCard icon={FileText} label="Job Requests" count={preview.job_requests} color="red" />
              <DataCard icon={Bell} label="Notifications" count={preview.notifications} color="red" />
              <DataCard icon={Bell} label="Admin Notifications" count={preview.admin_notifications} color="red" />
              <DataCard icon={Activity} label="Activity Logs" count={preview.activity_logs} color="red" />
              <DataCard icon={Shield} label="Whitelist Requests" count={preview.whitelist_requests} color="red" />
              <DataCard icon={FileText} label="Deleted Jobs History" count={preview.deleted_jobs_history} color="red" />
            </div>
          </div>

          {/* Data to be DISABLED/CLEARED */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="text-orange-500" size={20} />
              <span>Data that will be disabled / cleared</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataCard icon={ClipboardList} label="Active PRN Ranges" count={preview.active_prn_ranges} color="orange" subtitle="Will be disabled" />
              <DataCard icon={Users} label="Active Students" count={preview.active_students} color="orange" subtitle="Logins disabled" />
              <DataCard icon={Camera} label="Student Photos" count={preview.student_photos} color="orange" subtitle="Removed from Cloudinary" />
            </div>
          </div>

          {/* Data PRESERVED */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <CheckCircle className="text-green-500" size={20} />
              <span>Data that will be preserved</span>
            </h3>
            <p className="text-gray-600 text-sm">
              Colleges, regions, branches, placement officers, super admins, PRN ranges (disabled),
              all student records (name, CGPA, profile, resume data), and company requirement templates
              will remain intact and accessible for export.
            </p>
          </div>

          {/* Academic Year Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Academic Year Being Closed
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g., 2025-26"
              className="w-full max-w-xs px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-lg font-mono"
            />
            <p className="text-xs text-gray-500 mt-2">
              This will be recorded as the reason for disabling PRN ranges.
            </p>
          </div>

          {/* Proceed Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!academicYear || !/^\d{4}-\d{2}$/.test(academicYear)) {
                  toast.error('Please enter a valid academic year (e.g., 2025-26)');
                  return;
                }
                if (isNothingToReset) {
                  toast.error('Nothing to reset');
                  return;
                }
                setStep(2);
              }}
              disabled={isNothingToReset}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
            >
              <span>Proceed to Confirmation</span>
              <AlertTriangle size={18} />
            </button>
          </div>
        </AnimatedSection>
      )}

      {/* Step 2: Type Confirmation */}
      {step === 2 && (
        <AnimatedSection delay={0}>
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-red-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Reset</h2>
                <p className="text-gray-600">
                  To confirm, type <strong className="font-mono text-red-600">RESET {academicYear}</strong> below
                </p>
              </div>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type RESET ${academicYear}`}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-lg font-mono text-center mb-6"
                autoFocus
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setStep(1);
                    setConfirmText('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={confirmText !== `RESET ${academicYear}`}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Next</span>
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Step 3: Password Verification */}
      {step === 3 && (
        <AnimatedSection delay={0}>
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-red-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Verification</h2>
                <p className="text-gray-600">
                  Enter your admin password to execute the reset
                </p>
              </div>

              <div className="relative mb-6">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && !executing) handleExecute();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Final Warning */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700 font-medium">
                  This will permanently delete all jobs, applications, notifications, and activity logs
                  for academic year <strong>{academicYear}</strong>. Student data will be preserved but logins disabled.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setStep(2);
                    setPassword('');
                  }}
                  disabled={executing}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleExecute}
                  disabled={!password || executing}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {executing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      <span>Execute Reset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Step Complete: Result */}
      {step === 'complete' && result && (
        <AnimatedSection delay={0}>
          <div className="max-w-2xl mx-auto">
            {/* Success Banner */}
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="text-green-600 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-xl font-bold text-green-800">Reset Complete</h3>
                  <p className="text-green-700">
                    Academic year <strong>{academicYear}</strong> has been successfully reset.
                    The system is ready for a new academic year.
                  </p>
                </div>
              </div>
            </div>

            {/* DB Reset Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Database Reset Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <ResultRow label="PRN Ranges Disabled" value={result.db_reset.prn_ranges_disabled} />
                <ResultRow label="Students Deactivated" value={result.db_reset.students_deactivated} />
                <ResultRow label="Jobs Deleted" value={result.db_reset.jobs_deleted} />
                <ResultRow label="Job Requests Deleted" value={result.db_reset.job_requests_deleted} />
                <ResultRow label="Notifications Deleted" value={result.db_reset.notifications_deleted} />
                <ResultRow label="Whitelist Requests" value={result.db_reset.whitelist_requests_deleted} />
                <ResultRow label="Job History Cleared" value={result.db_reset.deleted_jobs_history_cleared} />
                <ResultRow label="Photos Cleared" value={result.db_reset.student_photos_cleared} />
              </div>
            </div>

            {/* Cloudinary Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cloudinary Cleanup</h3>
              <div className="grid grid-cols-2 gap-3">
                <ResultRow label="Photos Deleted" value={result.cloudinary_cleanup.deleted} />
                <ResultRow label="Folders Cleaned" value={result.cloudinary_cleanup.folders_deleted} />
                {result.cloudinary_cleanup.failed > 0 && (
                  <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <p className="text-sm text-yellow-700">
                      {result.cloudinary_cleanup.failed} photos could not be deleted from Cloudinary.
                      These orphaned images can be cleaned up manually from the Cloudinary dashboard.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Return Button */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/super-admin/dashboard')}
                className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}

function DataCard({ icon: Icon, label, count, color, subtitle }) {
  const colorMap = {
    red: 'bg-red-50 border-red-100 text-red-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    green: 'bg-green-50 border-green-100 text-green-700',
  };

  return (
    <div className={`${colorMap[color]} border rounded-xl p-4 flex items-center space-x-3`}>
      <Icon size={20} className="flex-shrink-0" />
      <div>
        <p className="font-bold text-lg">{count.toLocaleString()}</p>
        <p className="text-sm font-medium">{label}</p>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-bold text-gray-900">{value ?? 0}</span>
    </div>
  );
}
