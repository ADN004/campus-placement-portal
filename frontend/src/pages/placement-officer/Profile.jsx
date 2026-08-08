import { useState, useEffect, useRef } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ChangePassword from '../../components/ChangePassword';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import ProfilePage from './profile/ProfilePage';
import ConfirmRemoveModal from './profile/ProfileModals';
import {
  DesktopProfileSkeleton,
  TabletProfileSkeleton,
  MobileProfileSkeleton,
} from './profile/ProfilePageSkeleton';

const MAX_IMAGE_BYTES = 500 * 1024;
/*
 * PNG and JPEG only, because those are the two formats PDFKit can embed.
 *
 * GIF and WebP were accepted here, and both upload perfectly happily — then
 * every PDF that draws the logo throws "Unknown image format" at doc.image().
 * For the college logo that is the placement poster, which is the main reason
 * the logo exists: the officer would upload one, be told it worked, and find
 * the poster failing with no hint the two were connected.
 */
const ACCEPTED = ['image/png', 'image/jpeg'];

/** Read a File as a base64 data URL, as both upload endpoints expect. */
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

/** Shared validation for both images, so they cannot disagree about limits. */
function rejectionReason(file) {
  if (!file.type.startsWith('image/')) return 'That is not an image file.';
  if (!ACCEPTED.includes(file.type)) return 'Use a PNG or JPG image.';
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${Math.round(file.size / 1024)} KB. The limit is 500 KB.`;
  }
  return null;
}

/**
 * PlacementOfficerProfile — container.
 *
 * Owns the profile fetch, the two editable fields, and both image uploads; the
 * presenter renders what it is handed.
 *
 * The college logo used to live in components/CollegeLogoUpload, which had one
 * consumer (this page), announced its results with `alert()`, asked for
 * confirmation with `window.confirm()`, and drew its own bordered card inside
 * the card this page already wrapped it in — two headings for one thing. Its
 * two API calls moved here so the page owns its state like every other officer
 * page, and it now shares the photo's validation and its dialog.
 */
export default function PlacementOfficerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({ officer_name: '', email: '' });

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [confirmPhotoRemove, setConfirmPhotoRemove] = useState(false);
  const photoInputRef = useRef(null);

  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [confirmLogoRemove, setConfirmLogoRemove] = useState(false);
  const logoInputRef = useRef(null);

  const deviceType = useDeviceType();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await placementOfficerAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
      setLogoUrl(profileData.logo_url || null);
      setFormData({
        officer_name: profileData.officer_name || '',
        email: profileData.officer_email || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------- fields */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.officer_name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setSaving(true);
    try {
      await placementOfficerAPI.updateProfile(formData);
      toast.success('Profile updated');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Cancel restores the form from `officer_email`, not `email`.
   *
   * getProfile returns `po.*` joined with `u.email`, and for an officer
   * `users.email` is their *phone number* — it is the login identifier, not a
   * contact address. Cancel read `profile.email`, so backing out of an edit
   * quietly replaced the contact email in the form with the phone number.
   * Re-opening Edit then showed the phone number in the email field, and Save
   * failed the address check with a message that made no sense next to it.
   */
  const handleCancel = () => {
    setFormData({
      officer_name: profile?.officer_name || '',
      email: profile?.officer_email || '',
    });
    setEditMode(false);
  };

  /* --------------------------------------------------------------- images */

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reason = rejectionReason(file);
    if (reason) {
      setPhotoError(reason);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    setPhotoError('');
    setPhotoUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      await placementOfficerAPI.uploadOwnPhoto({ photo: dataUrl });
      toast.success('Photo updated');
      await fetchProfile();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to upload photo';
      setPhotoError(message);
      toast.error(message);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoDeleting(true);
    try {
      await placementOfficerAPI.deleteOwnPhoto();
      toast.success('Photo removed');
      setConfirmPhotoRemove(false);
      await fetchProfile();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove photo';
      setPhotoError(message);
      toast.error(message);
    } finally {
      setPhotoDeleting(false);
    }
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reason = rejectionReason(file);
    if (reason) {
      setLogoError(reason);
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    setLogoError('');
    setLogoUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const response = await placementOfficerAPI.uploadCollegeLogo(dataUrl);
      const nextUrl = response.data?.data?.logo_url || null;
      setLogoUrl(nextUrl);
      setProfile((prev) => (prev ? { ...prev, logo_url: nextUrl } : prev));
      toast.success('College logo updated');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to upload logo';
      setLogoError(message);
      toast.error(message);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    setLogoDeleting(true);
    try {
      await placementOfficerAPI.deleteCollegeLogo();
      setLogoUrl(null);
      setProfile((prev) => (prev ? { ...prev, logo_url: null } : prev));
      toast.success('College logo removed');
      setConfirmLogoRemove(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove logo';
      setLogoError(message);
      toast.error(message);
    } finally {
      setLogoDeleting(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileProfileSkeleton />;
    if (deviceType === 'tablet') return <TabletProfileSkeleton />;
    return <DesktopProfileSkeleton />;
  }

  return (
    <>
      <ProfilePage
        layout={deviceType}
        profile={profile}
        formData={formData}
        editMode={editMode}
        saving={saving}
        photo={{
          inputRef: photoInputRef,
          uploading: photoUploading,
          deleting: photoDeleting,
          error: photoError,
          onSelect: handlePhotoSelect,
          onDelete: () => setConfirmPhotoRemove(true),
        }}
        logo={{
          url: logoUrl,
          inputRef: logoInputRef,
          uploading: logoUploading,
          deleting: logoDeleting,
          error: logoError,
          onSelect: handleLogoSelect,
          onDelete: () => setConfirmLogoRemove(true),
        }}
        onChange={handleChange}
        onEdit={() => setEditMode(true)}
        onSave={handleSubmit}
        onCancel={handleCancel}
        onChangePassword={() => setShowChangePassword(true)}
      />

      {confirmPhotoRemove && (
        <ConfirmRemoveModal
          id="confirm-photo-remove"
          title="Remove your profile photo?"
          confirmLabel="Remove photo"
          busy={photoDeleting}
          onConfirm={handlePhotoRemove}
          onClose={() => setConfirmPhotoRemove(false)}
        >
          You can upload a new one at any time.
        </ConfirmRemoveModal>
      )}

      {confirmLogoRemove && (
        <ConfirmRemoveModal
          id="confirm-logo-remove"
          title="Remove the college logo?"
          confirmLabel="Remove logo"
          busy={logoDeleting}
          onConfirm={handleLogoRemove}
          onClose={() => setConfirmLogoRemove(false)}
        >
          The placement poster cannot be generated without a logo, so that page will stop working
          until a new one is uploaded.
        </ConfirmRemoveModal>
      )}

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} variant="officer" />
      )}
    </>
  );
}
