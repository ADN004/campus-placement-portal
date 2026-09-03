import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import ChangePassword from '../../components/ChangePassword';
import ProfileBody from './profile/ProfileBody';
import ProfileSkeleton from './profile/ProfileSkeleton';

/**
 * Super admin profile — container.
 *
 * All state, effects and handlers live here; `ProfileBody` draws them and owns
 * no logic. Behaviour is unchanged from the page this replaces: the same two
 * editable fields, the same read-only email, the same validation message, the
 * same modal.
 *
 * `ChangePassword` is shared by all three roles and takes `variant="admin"`.
 */
export default function SuperAdminProfile() {
  const { user } = useAuth();
  const deviceType = useDeviceType();
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        phone_number: profileData.phone_number || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone_number) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      await superAdminAPI.updateProfile(formData);
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
      name: profile.name || '',
      phone_number: profile.phone_number || '',
    });
    setEditMode(false);
  };

  if (showSkeleton) return <ProfileSkeleton layout={deviceType} />;

  return (
    <>
      <ProfileBody
        layout={deviceType}
        profile={profile}
        email={user?.email}
        formData={formData}
        editMode={editMode}
        saving={saving}
        onEdit={() => setEditMode(true)}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onChangePassword={() => setShowChangePassword(true)}
      />

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} variant="admin" />
      )}
    </>
  );
}
