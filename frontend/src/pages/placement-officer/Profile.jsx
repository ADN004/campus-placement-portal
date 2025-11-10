import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Building2, MapPin, Lock, Edit, Save, X } from 'lucide-react';
import ChangePassword from '../../components/ChangePassword';

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
        email: profileData.email || '',
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

    if (!formData.officer_name || !formData.email) {
      toast.error('All fields are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View and manage your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Profile Information</h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <Edit size={18} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn btn-secondary flex items-center space-x-2"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="label flex items-center">
                  <User size={18} className="mr-2" />
                  Full Name <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="text"
                    name="officer_name"
                    value={formData.officer_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your full name"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.officer_name || 'Not set'}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="label flex items-center">
                  <Mail size={18} className="mr-2" />
                  Email Address <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your email address"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.email || 'Not set'}</p>
                )}
              </div>

              {/* Phone Number (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <Phone size={18} className="mr-2" />
                  Phone Number
                </label>
                <p className="text-gray-900 font-medium">{profile?.phone_number || 'Not set'}</p>
                <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
              </div>

              {/* College (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <Building2 size={18} className="mr-2" />
                  College
                </label>
                <p className="text-gray-900 font-medium">{profile?.college_name}</p>
              </div>

              {/* Region (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <MapPin size={18} className="mr-2" />
                  Region
                </label>
                <p className="text-gray-900 font-medium">{profile?.region_name}</p>
              </div>
            </form>
          </div>
        </div>

        {/* Security Card */}
        <div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Security</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Lock className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Password</h4>
                    <p className="text-sm text-blue-800">
                      Keep your account secure by using a strong password
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Lock size={18} />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium text-gray-900">Placement Officer</span>
              </div>
              <div>
                <span className="text-gray-600">Appointed:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {profile?.appointed_date
                    ? new Date(profile.appointed_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last Login:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {user?.last_login
                    ? new Date(user.last_login).toLocaleString('en-US', {
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
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
