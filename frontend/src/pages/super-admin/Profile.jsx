import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Edit, Save, X, Shield, Award, Calendar } from 'lucide-react';
import ChangePassword from '../../components/ChangePassword';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import SectionHeader from '../../components/SectionHeader';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import ProfileSkeleton from '../../components/skeletons/ProfileSkeleton';

export default function SuperAdminProfile() {
  const { user } = useAuth();
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

  if (showSkeleton) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen pb-8">
      {/* Dashboard Header */}
      <AnimatedSection delay={0}>
        <DashboardHeader
          icon={User}
          title="My Profile"
          subtitle="View and manage your profile information"
        />
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <AnimatedSection delay={0.08} className="lg:col-span-2">
          <GlassCard variant="elevated" className="p-8">
            <div className="flex justify-between items-center mb-6">
              <SectionHeader title="Profile Information" icon={User} />
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
                >
                  <Edit size={18} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                  >
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
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
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <User size={18} className="mr-2 text-blue-600" />
                  Full Name <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                    placeholder="Enter your full name"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-semibold text-lg bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                    {profile?.name || 'Not set'}
                  </p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <Mail size={18} className="mr-2 text-blue-600" />
                  Email Address
                </label>
                <p className="text-gray-900 font-semibold text-lg bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 mt-2 font-medium">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <Phone size={18} className="mr-2 text-blue-600" />
                  Phone Number <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                    placeholder="Enter your phone number"
                    pattern="[0-9]{10}"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-semibold text-lg bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                    {profile?.phone_number || 'Not set'}
                  </p>
                )}
              </div>
            </form>
          </GlassCard>
        </AnimatedSection>

        {/* Security & Info Sidebar */}
        <div className="space-y-6">
          {/* Security Card */}
          <AnimatedSection delay={0.16}>
          <GlassCard variant="elevated" className="p-6">
            <SectionHeader title="Security" icon={Lock} />
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <Lock className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Password</h4>
                    <p className="text-sm text-blue-800 font-medium">
                      Keep your account secure by using a strong password
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Lock size={18} />
                <span>Change Password</span>
              </button>
            </div>
          </GlassCard>
          </AnimatedSection>

          {/* Account Info Card */}
          <AnimatedSection delay={0.24}>
          <GlassCard variant="elevated" className="p-6">
            <SectionHeader title="Account Information" icon={Shield} />
            <div className="mt-4 space-y-3">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                <span className="text-sm text-gray-600 font-semibold block mb-1">Role:</span>
                <span className="text-lg font-bold text-purple-700 flex items-center">
                  <Award size={18} className="mr-2" />
                  Super Administrator
                </span>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                <span className="text-sm text-gray-600 font-semibold block mb-1">Last Login:</span>
                <span className="text-sm font-bold text-blue-700 flex items-center">
                  <Calendar size={16} className="mr-2" />
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
          </AnimatedSection>

          {/* Admin Privileges Card */}
          <AnimatedSection delay={0.32}>
          <GlassCard variant="elevated" className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2">
                <Award className="text-white" size={20} />
              </div>
              <h3 className="font-bold text-green-900 text-lg">Administrator Privileges</h3>
            </div>
            <ul className="text-green-800 space-y-2 font-medium">
              <li className="flex items-start">
                <span className="mr-2 text-green-600 font-bold">✓</span>
                Full system access
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600 font-bold">✓</span>
                Manage all placement officers
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600 font-bold">✓</span>
                Create and manage jobs
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600 font-bold">✓</span>
                View all activity logs
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600 font-bold">✓</span>
                System configuration
              </li>
            </ul>
          </GlassCard>
          </AnimatedSection>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
