import { useState, useEffect } from 'react';
import { studentAPI, commonAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ChangePassword from '../../components/ChangePassword';
import api from '../../services/api';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopProfile, { DesktopProfileSkeleton } from './profile/DesktopProfile';
import TabletProfile, { TabletProfileSkeleton } from './profile/TabletProfile';
import MobileProfile, { MobileProfileSkeleton } from './profile/MobileProfile';

/**
 * StudentProfile — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. The sections themselves live in profile/profileSections so the
 * rules about which fields are editable exist in exactly one place.
 */
export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [extendedProfile, setExtendedProfile] = useState(null);
  const [extendedProfileLoading, setExtendedProfileLoading] = useState(true);
  const [cgpaLocked, setCgpaLocked] = useState(false);
  const [cgpaUnlockEnd, setCgpaUnlockEnd] = useState(null);
  const [backlogLocked, setBacklogLocked] = useState(false);
  const [backlogUnlockEnd, setBacklogUnlockEnd] = useState(null);
  // Correction workflow
  const [collegeBranches, setCollegeBranches] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resolvingCorrection, setResolvingCorrection] = useState(false);
  const deviceType = useDeviceType();
  const [formData, setFormData] = useState({
    // Registration identity fields — only editable while a correction is open
    student_name: '',
    branch: '',
    date_of_birth: '',
    gender: '',
    mobile_number: '',
    height: '',
    weight: '',
    complete_address: '',
    cgpa_sem1: '',
    cgpa_sem2: '',
    cgpa_sem3: '',
    cgpa_sem4: '',
    cgpa_sem5: '',
    cgpa_sem6: '',
    has_driving_license: false,
    has_pan_card: false,
    has_aadhar_card: false,
    has_passport: false,
    backlogs_sem1: '0',
    backlogs_sem2: '0',
    backlogs_sem3: '0',
    backlogs_sem4: '0',
    backlogs_sem5: '0',
    backlogs_sem6: '0',
    backlog_details: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchExtendedProfile();
    fetchCgpaLockStatus();
    fetchBacklogLockStatus();
  }, []);

  // Skeleton loading gate
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Lock scroll during skeleton
  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
      setFormData({
        student_name: profileData.student_name || '',
        branch: profileData.branch || '',
        date_of_birth: profileData.date_of_birth ? String(profileData.date_of_birth).split('T')[0] : '',
        gender: profileData.gender || '',
        mobile_number: profileData.mobile_number || '',
        height: profileData.height || '',
        weight: profileData.weight || '',
        complete_address: profileData.complete_address || '',
        cgpa_sem1: profileData.cgpa_sem1 || '',
        cgpa_sem2: profileData.cgpa_sem2 || '',
        cgpa_sem3: profileData.cgpa_sem3 || '',
        cgpa_sem4: profileData.cgpa_sem4 || '',
        cgpa_sem5: profileData.cgpa_sem5 || '',
        cgpa_sem6: profileData.cgpa_sem6 || '',
        has_driving_license: profileData.has_driving_license || false,
        has_pan_card: profileData.has_pan_card || false,
        has_aadhar_card: profileData.has_aadhar_card || false,
        has_passport: profileData.has_passport || false,
        backlogs_sem1: profileData.backlogs_sem1 !== undefined ? String(profileData.backlogs_sem1) : '0',
        backlogs_sem2: profileData.backlogs_sem2 !== undefined ? String(profileData.backlogs_sem2) : '0',
        backlogs_sem3: profileData.backlogs_sem3 !== undefined ? String(profileData.backlogs_sem3) : '0',
        backlogs_sem4: profileData.backlogs_sem4 !== undefined ? String(profileData.backlogs_sem4) : '0',
        backlogs_sem5: profileData.backlogs_sem5 !== undefined ? String(profileData.backlogs_sem5) : '0',
        backlogs_sem6: profileData.backlogs_sem6 !== undefined ? String(profileData.backlogs_sem6) : '0',
        backlog_details: profileData.backlog_details || '',
      });
      // Load this college's branches for the Branch dropdown (used only while a
      // correction has unlocked the field)
      if (profileData.college_id) {
        commonAPI.getCollegeBranches(profileData.college_id)
          .then((r) => {
            let b = r.data?.data?.branches ?? [];
            if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = []; } }
            setCollegeBranches(Array.isArray(b) ? b : []);
          })
          .catch(() => setCollegeBranches([]));
      }
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectionPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    // Same limit as registration (max 500KB) — fail fast before uploading
    if (file.size > 500 * 1024) {
      toast.error('Photo size must be less than 500KB');
      return;
    }
    setPhotoUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await studentAPI.reuploadPhoto(base64);
      toast.success('New photo uploaded');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleResolveCorrection = async () => {
    setResolvingCorrection(true);
    try {
      const res = await studentAPI.resolveCorrection();
      toast.success(res.data?.message || 'Corrections saved');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not mark as done');
    } finally {
      setResolvingCorrection(false);
    }
  };

  const fetchExtendedProfile = async () => {
    setExtendedProfileLoading(true);
    try {
      const response = await api.get('/students/extended-profile');
      setExtendedProfile(response.data.data);
    } catch (error) {
      console.error('Error fetching extended profile:', error);
    } finally {
      setExtendedProfileLoading(false);
    }
  };

  const fetchCgpaLockStatus = async () => {
    try {
      const response = await studentAPI.getCgpaLockStatus();
      const data = response.data.data;
      setCgpaLocked(data.is_locked);
      setCgpaUnlockEnd(data.unlock_end || null);
    } catch {
      setCgpaLocked(true);
    }
  };

  const fetchBacklogLockStatus = async () => {
    try {
      const response = await studentAPI.getBacklogLockStatus();
      const data = response.data.data;
      setBacklogLocked(data.is_locked);
      setBacklogUnlockEnd(data.unlock_end || null);
    } catch {
      setBacklogLocked(true);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    try {
      await studentAPI.updateProfile(formData);
      toast.success('Profile updated successfully!');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      student_name: profile.student_name || '',
      branch: profile.branch || '',
      date_of_birth: profile.date_of_birth ? String(profile.date_of_birth).split('T')[0] : '',
      gender: profile.gender || '',
      mobile_number: profile.mobile_number || '',
      height: profile.height || '',
      weight: profile.weight || '',
      complete_address: profile.complete_address || '',
      cgpa_sem1: profile.cgpa_sem1 || '',
      cgpa_sem2: profile.cgpa_sem2 || '',
      cgpa_sem3: profile.cgpa_sem3 || '',
      cgpa_sem4: profile.cgpa_sem4 || '',
      cgpa_sem5: profile.cgpa_sem5 || '',
      cgpa_sem6: profile.cgpa_sem6 || '',
      has_driving_license: profile.has_driving_license || false,
      has_pan_card: profile.has_pan_card || false,
      has_aadhar_card: profile.has_aadhar_card || false,
      has_passport: profile.has_passport || false,
      backlogs_sem1: profile.backlogs_sem1 !== undefined ? String(profile.backlogs_sem1) : '0',
      backlogs_sem2: profile.backlogs_sem2 !== undefined ? String(profile.backlogs_sem2) : '0',
      backlogs_sem3: profile.backlogs_sem3 !== undefined ? String(profile.backlogs_sem3) : '0',
      backlogs_sem4: profile.backlogs_sem4 !== undefined ? String(profile.backlogs_sem4) : '0',
      backlogs_sem5: profile.backlogs_sem5 !== undefined ? String(profile.backlogs_sem5) : '0',
      backlogs_sem6: profile.backlogs_sem6 !== undefined ? String(profile.backlogs_sem6) : '0',
      backlog_details: profile.backlog_details || '',
    });
    setEditMode(false);
  };

  // Named for passing to the presenters — same calls as the inline handlers.
  const handleEdit = () => setEditMode(true);
  const handleOpenChangePassword = () => setShowChangePassword(true);
  const handleCloseChangePassword = () => setShowChangePassword(false);

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileProfileSkeleton />;
    if (deviceType === 'tablet') return <TabletProfileSkeleton />;
    return <DesktopProfileSkeleton />;
  }

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    profile,
    user,
    formData,
    editMode,
    saving,
    collegeBranches,
    cgpaLocked,
    cgpaUnlockEnd,
    backlogLocked,
    backlogUnlockEnd,
    extendedProfile,
    extendedProfileLoading,
    photoUploading,
    resolvingCorrection,
    onChange: handleChange,
    onSubmit: handleSubmit,
    onEdit: handleEdit,
    onCancel: handleCancel,
    onPhoto: handleCorrectionPhoto,
    onResolveCorrection: handleResolveCorrection,
    onChangePassword: handleOpenChangePassword,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileProfile {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletProfile {...presenterProps} />
      ) : (
        <DesktopProfile {...presenterProps} />
      )}

      {/* Change Password Modal */}
      {showChangePassword && <ChangePassword onClose={handleCloseChangePassword} variant="spc" />}
    </>
  );
}
