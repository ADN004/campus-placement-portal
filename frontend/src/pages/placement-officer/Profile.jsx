import { useState, useEffect, useRef } from 'react';
import { placementOfficerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Building2, MapPin, Lock, Edit, Save, X, Camera, Trash2, Upload } from 'lucide-react';
import ChangePassword from '../../components/ChangePassword';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import CollegeLogoUpload from '../../components/CollegeLogoUpload';

export default function PlacementOfficerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    officer_name: '',
    email: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await placementOfficerAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.officer_name) {
      toast.error('Name is required');
      return;
    }

    // Validate email format only if provided
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
      officer_name: profile.officer_name || '',
      email: profile.email || '',
    });
    setEditMode(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('Image size should be less than 500KB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        try {
          const base64Image = reader.result;
          await placementOfficerAPI.uploadOwnPhoto({ photo: base64Image });
          toast.success('Profile photo uploaded successfully');
          fetchProfile();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to upload photo');
        } finally {
          setUploadingPhoto(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingPhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
    } catch (error) {
      toast.error('Failed to process image');
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    setDeletingPhoto(true);
    try {
      await placementOfficerAPI.deleteOwnPhoto();
      toast.success('Profile photo deleted successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    } finally {
      setDeletingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <DashboardHeader
        icon={User}
        title="My Profile"
        subtitle="View and manage your profile information"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <GlassCard variant="elevated" className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                  >
                    <Edit size={18} />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <X size={18} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 mr-3">
                      <User size={18} className="text-white" />
                    </div>
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="officer_name"
                      value={formData.officer_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      placeholder="Enter your full name"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-lg ml-11">{profile?.officer_name || 'Not set'}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2 mr-3">
                      <Mail size={18} className="text-white" />
                    </div>
                    Email Address
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium bg-white"
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-lg ml-11">{profile?.officer_email || 'Not set'}</p>
                  )}
                </div>

                {/* Phone Number (Read-only) */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border-2 border-gray-200">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                    <div className="bg-gray-700 rounded-lg p-2 mr-3">
                      <Lock size={18} className="text-white" />
                    </div>
                    Read-Only Information (Cannot be changed)
                  </label>
                  <div className="space-y-4 ml-11">
                    <div>
                      <div className="flex items-center text-sm font-bold text-gray-600 mb-1">
                        <Phone size={16} className="mr-2" />
                        Phone Number
                      </div>
                      <p className="text-gray-900 font-medium">{profile?.phone_number || 'Not set'}</p>
                    </div>
                    <div>
                      <div className="flex items-center text-sm font-bold text-gray-600 mb-1">
                        <Building2 size={16} className="mr-2" />
                        College
                      </div>
                      <p className="text-gray-900 font-medium">{profile?.college_name}</p>
                    </div>
                    <div>
                      <div className="flex items-center text-sm font-bold text-gray-600 mb-1">
                        <MapPin size={16} className="mr-2" />
                        Region
                      </div>
                      <p className="text-gray-900 font-medium">{profile?.region_name}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-100">
                  <label className="flex items-center text-sm font-bold text-gray-700 mb-5">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2 mr-3">
                      <Camera size={18} className="text-white" />
                    </div>
                    Profile Photo
                  </label>

                  <div className="flex items-start space-x-6 ml-11">
                    {profile?.photo_url ? (
                      <div className="relative group">
                        <img
                          src={profile.photo_url}
                          alt="Profile"
                          className="w-32 h-32 object-cover rounded-2xl border-4 border-white shadow-xl"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={handlePhotoDelete}
                            disabled={deletingPhoto}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-white rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center">
                        <User size={48} className="text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 cursor-pointer inline-flex ${
                          uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload size={18} />
                        <span>{uploadingPhoto ? 'Uploading...' : profile?.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                      </label>
                      <p className="text-xs text-gray-600 mt-3 font-medium">
                        JPG, PNG or GIF. Max size 500KB.
                      </p>
                      {profile?.photo_url && (
                        <button
                          onClick={handlePhotoDelete}
                          disabled={deletingPhoto}
                          className="bg-red-100 text-red-600 hover:bg-red-200 font-bold px-4 py-2 rounded-xl mt-3 flex items-center space-x-2 transition-all transform hover:scale-105"
                        >
                          <Trash2 size={14} />
                          <span>{deletingPhoto ? 'Deleting...' : 'Delete Photo'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </GlassCard>
          </div>

          {/* Security Card */}
          <div className="space-y-6">
            <GlassCard variant="elevated" className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Security</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100">
                  <div className="flex items-start">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 mr-3 flex-shrink-0">
                      <Lock className="text-white" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Password</h4>
                      <p className="text-sm text-gray-600 font-medium">
                        Keep your account secure by using a strong password
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Lock size={18} />
                  <span>Change Password</span>
                </button>
              </div>
            </GlassCard>

            {/* Account Info */}
            <GlassCard variant="elevated" className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-100">
                  <span className="text-sm font-bold text-gray-600">Role:</span>
                  <span className="ml-2 font-bold text-purple-900">Placement Officer</span>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-100">
                  <span className="text-sm font-bold text-gray-600">Appointed:</span>
                  <span className="ml-2 font-bold text-green-900">
                    {profile?.appointed_date
                      ? new Date(profile.appointed_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-100">
                  <span className="text-sm font-bold text-gray-600">Last Login:</span>
                  <span className="ml-2 font-bold text-blue-900">
                    {profile?.last_login
                      ? new Date(profile.last_login).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* College Logo Upload */}
            {!loading && (
              <GlassCard variant="elevated" className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">College Branding</h2>
                <CollegeLogoUpload
                  currentLogoUrl={profile?.logo_url}
                  onLogoUpdate={(newUrl) => {
                    setProfile(prev => ({
                      ...prev,
                      logo_url: newUrl,
                      logo_uploaded_at: new Date().toISOString()
                    }));
                  }}
                />
              </GlassCard>
            )}
          </div>
        </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
