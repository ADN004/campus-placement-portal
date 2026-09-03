import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import ResetBody from './yearReset/ResetBody';
import ResetSkeleton from './yearReset/ResetSkeleton';

/**
 * Academic year reset — container.
 *
 * The most destructive action on the portal, so every gate is carried over
 * exactly: the preview, `RESET <year>` typed out, and the admin's own password.
 * Nothing here has been made easier to get through.
 */
export default function AcademicYearReset() {
  const deviceType = useDeviceType();
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

  /*
   * Left exactly as it was, including the omission.
   *
   * `job_drives` is shown as one of the nine things that will be deleted, but it
   * is not in this sum — so a portal whose only remaining data was job drives
   * would be told there is "nothing to reset" and the button would stay
   * disabled. In practice it is unreachable: the reset deletes jobs and the
   * drives cascade from them, so drives cannot exist without jobs, and `jobs`
   * is counted. Recorded in the progress log rather than changed, because
   * correcting it would enable a destructive action in a case where it is
   * currently refused.
   */
  const totalDataItems = preview
    ? preview.jobs + preview.job_applications + preview.job_requests +
      preview.notifications + preview.admin_notifications + preview.activity_logs +
      preview.whitelist_requests + preview.deleted_jobs_history
    : 0;

  const isNothingToReset = preview && totalDataItems === 0 && preview.active_prn_ranges === 0 && preview.student_photos === 0;

  if (showSkeleton) return <ResetSkeleton layout={deviceType} />;

  return (
    <ResetBody
      layout={deviceType}
      step={step}
      preview={preview}
      result={result}
      isNothingToReset={isNothingToReset}
      academicYear={academicYear}
      onAcademicYear={setAcademicYear}
      confirmText={confirmText}
      onConfirmText={setConfirmText}
      password={password}
      onPassword={setPassword}
      showPassword={showPassword}
      onToggleShowPassword={() => setShowPassword((v) => !v)}
      executing={executing}
      onProceed={() => {
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
      onBackToOne={() => { setStep(1); setConfirmText(''); }}
      onProceedToPassword={() => setStep(3)}
      onBackToTwo={() => { setStep(2); setPassword(''); }}
      onExecute={handleExecute}
      onReturnToDashboard={() => navigate('/super-admin/dashboard')}
    />
  );
}
