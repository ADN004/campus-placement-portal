import { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Lock, Edit, Save, X, GraduationCap, FileText, Users, CheckCircle2, Shield, Calendar, UserCircle } from 'lucide-react';
import ChangePassword from '../../components/ChangePassword';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import GradientOrb from '../../components/GradientOrb';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import { BRANCH_SHORT_NAMES } from '../../constants/branches';

// Skeleton for profile page
function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-10 w-40 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
        <div className="h-5 w-72 bg-gray-200/50 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main profile card skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
            {/* Title + edit button */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gray-200/70 rounded-xl animate-pulse" />
                <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-blue-100/70 rounded-xl animate-pulse" />
            </div>

            {/* Read-only fields */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200/50 mb-6">
              <div className="h-5 w-56 bg-gray-200/70 rounded-lg animate-pulse mb-5" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="h-3 w-16 bg-gray-200/70 rounded animate-pulse mb-2" />
                    <div className="h-5 w-32 bg-gray-200/70 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-6">
              <div className="h-6 w-40 bg-gray-200/70 rounded-lg animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-gray-200/70 rounded animate-pulse mb-2" />
                  <div className="h-12 w-full bg-gray-100/70 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>

            {/* Academic section */}
            <div className="mt-6 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
              <div className="h-6 w-48 bg-gray-200/70 rounded-lg animate-pulse mb-5" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-gray-200/70 rounded animate-pulse mb-2" />
                    <div className="h-10 w-full bg-white rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div className="h-6 w-24 bg-gray-200/70 rounded-lg animate-pulse mb-6" />
            <div className="h-12 w-full bg-blue-100/70 rounded-xl animate-pulse" />
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div className="h-6 w-44 bg-gray-200/70 rounded-lg animate-pulse mb-6" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 w-full bg-gray-100/70 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
  const [formData, setFormData] = useState({
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
    document.body.style.overflow = showSkeleton ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showSkeleton]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
      setFormData({
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
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Rejected' },
      blacklisted: { color: 'bg-gray-800 text-white border-gray-900', text: 'Blacklisted' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', text: status };
    return <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${config.color}`}>{config.text}</span>;
  };

  if (loading || showSkeleton) return <ProfileSkeleton />;

  return (
    <div>
      <GradientOrb color="blue" position="top-right" />
      <GradientOrb color="indigo" position="bottom-left" delay="2s" />
      <GradientOrb color="purple" position="center" delay="4s" />

      {/* Header */}
      <motion.div className="mb-8" variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0 }}>
        <DashboardHeader
          icon={UserCircle}
          title="My Profile"
          subtitle="View and manage your profile information"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.1 }}>
            <GlassCard className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3">
                    <User className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    Profile Information
                  </h2>
                </div>
                {!editMode ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditMode(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2"
                  >
                    <Edit size={18} />
                    <span>Edit Profile</span>
                  </motion.button>
                ) : (
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      disabled={saving}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Save size={18} />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCancel}
                      disabled={saving}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <X size={18} />
                      <span>Cancel</span>
                    </motion.button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Read-only Fields Section */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center">
                    <div className="bg-gray-700 rounded-lg p-2 mr-3">
                      <Lock size={18} className="text-white" />
                    </div>
                    Read-Only Information (Cannot be changed)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">PRN Number</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.prn}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Full Name</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.student_name || 'Not set'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Date of Birth</label>
                      <p className="text-gray-900 font-bold text-lg">
                        {profile?.date_of_birth
                          ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Not set'}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Age</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.age || 'Not set'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Gender</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.gender || 'Not set'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Branch/Department</label>
                      <p className="text-gray-900 font-bold text-lg">
                        {profile?.branch} {BRANCH_SHORT_NAMES[profile?.branch] ? <span className="text-blue-600">({BRANCH_SHORT_NAMES[profile?.branch]})</span> : ''}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">College</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.college_name}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Region</label>
                      <p className="text-gray-900 font-bold text-lg">{profile?.region_name}</p>
                    </div>
                    <div className="md:col-span-2 bg-white rounded-xl p-4 border border-gray-100">
                      <label className="text-sm font-semibold text-gray-600 mb-1 block">Email Address</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-gray-900 font-bold text-lg">{user?.email}</p>
                        {profile?.email_verified ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full border-2 border-green-300">
                            <CheckCircle2 size={16} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full border-2 border-red-300">
                            <X size={16} />
                            <span>Not Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 mr-3">
                      <Edit size={20} className="text-white" />
                    </div>
                    {editMode ? 'Edit Your Information' : 'Your Information'}
                  </h3>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
                    {editMode ? (
                      <input
                        type="tel"
                        name="mobile_number"
                        value={formData.mobile_number}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                        placeholder="10-digit mobile number"
                        pattern="[0-9]{10}"
                      />
                    ) : (
                      <p className="text-gray-900 font-bold text-lg bg-gray-50 rounded-xl p-4 border border-gray-100">{profile?.mobile_number || 'Not set'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Height (cm)</label>
                      {editMode ? (
                        <select
                          name="height"
                          value={formData.height}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                        >
                          <option value="">Select Height</option>
                          {Array.from({ length: 81 }, (_, i) => 140 + i).map(h => (
                            <option key={h} value={h}>{h} cm</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900 font-bold text-lg bg-gray-50 rounded-xl p-4 border border-gray-100">{profile?.height ? `${profile.height} cm` : 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg)</label>
                      {editMode ? (
                        <select
                          name="weight"
                          value={formData.weight}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                        >
                          <option value="">Select Weight</option>
                          {Array.from({ length: 121 }, (_, i) => 30 + i).map(w => (
                            <option key={w} value={w}>{w} kg</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900 font-bold text-lg bg-gray-50 rounded-xl p-4 border border-gray-100">{profile?.weight ? `${profile.weight} kg` : 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Complete Address</label>
                    {editMode ? (
                      <textarea
                        name="complete_address"
                        value={formData.complete_address}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                        placeholder="Enter your complete address"
                        rows="3"
                      />
                    ) : (
                      <p className="text-gray-900 font-bold text-lg bg-gray-50 rounded-xl p-4 border border-gray-100">{profile?.complete_address || 'Not set'}</p>
                    )}
                  </div>

                  {/* Academic Performance */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2 mr-3">
                        <GraduationCap size={20} className="text-white" />
                      </div>
                      Academic Performance
                    </h4>

                    {cgpaLocked && profile?.registration_status === 'approved' && (
                      <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Lock size={16} className="text-amber-600 flex-shrink-0" />
                        <p className="text-amber-800 text-sm font-medium">
                          CGPA fields are locked. Contact your placement officer to request an unlock window.
                        </p>
                      </div>
                    )}
                    {!cgpaLocked && cgpaUnlockEnd && profile?.registration_status === 'approved' && (
                      <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <Edit size={16} className="text-green-600 flex-shrink-0" />
                        <p className="text-green-800 text-sm font-medium">
                          CGPA editing is open until {new Date(cgpaUnlockEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map(sem => (
                        <div key={sem}>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Semester {sem} SGPA</label>
                          {editMode && !(cgpaLocked && profile?.registration_status === 'approved') ? (
                            <input
                              type="number"
                              name={`cgpa_sem${sem}`}
                              value={formData[`cgpa_sem${sem}`]}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                              placeholder="0.00"
                              min="0"
                              max="10"
                              step="0.01"
                            />
                          ) : (
                            <p className={`text-gray-900 font-bold text-lg bg-white rounded-xl p-3 border border-gray-100 ${cgpaLocked && editMode ? 'opacity-60' : ''}`}>{profile?.[`cgpa_sem${sem}`] || 'Not set'}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg">
                      <label className="text-sm font-bold text-white/90 mb-2 block">Programme CGPA (Average of filled semesters)</label>
                      <p className="text-white font-bold text-3xl">{profile?.programme_cgpa || 'Not calculated'}</p>
                      <p className="text-xs text-white/80 mt-2">Auto-calculated from all non-zero semester CGPAs</p>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2 mr-3">
                        <FileText size={20} className="text-white" />
                      </div>
                      Documents
                    </h4>

                    <div className="space-y-4">
                      {editMode ? (
                        <>
                          <div className="flex items-center bg-white rounded-xl p-4 border border-green-100">
                            <input id="has_driving_license" type="checkbox" name="has_driving_license" checked={formData.has_driving_license} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label htmlFor="has_driving_license" className="ml-3 text-base font-bold text-gray-800">I have a valid Driving License</label>
                          </div>
                          <div className="flex items-center bg-white rounded-xl p-4 border border-green-100">
                            <input id="has_pan_card" type="checkbox" name="has_pan_card" checked={formData.has_pan_card} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label htmlFor="has_pan_card" className="ml-3 text-base font-bold text-gray-800">I have a PAN Card</label>
                          </div>
                          <div className="flex items-center bg-white rounded-xl p-4 border border-green-100">
                            <input id="has_aadhar_card" type="checkbox" name="has_aadhar_card" checked={formData.has_aadhar_card} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label htmlFor="has_aadhar_card" className="ml-3 text-base font-bold text-gray-800">I have an Aadhar Card</label>
                          </div>
                          <div className="flex items-center bg-white rounded-xl p-4 border border-green-100">
                            <input id="has_passport" type="checkbox" name="has_passport" checked={formData.has_passport} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label htmlFor="has_passport" className="ml-3 text-base font-bold text-gray-800">I have a Passport</label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-green-100">
                            <span className="text-gray-700 font-bold">Driving License:</span>
                            <span className={`font-bold text-lg ${profile?.has_driving_license ? 'text-green-600' : 'text-gray-400'}`}>
                              {profile?.has_driving_license ? 'Yes ✓' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-green-100">
                            <span className="text-gray-700 font-bold">PAN Card:</span>
                            <span className={`font-bold text-lg ${profile?.has_pan_card ? 'text-green-600' : 'text-gray-400'}`}>
                              {profile?.has_pan_card ? 'Yes ✓' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-green-100">
                            <span className="text-gray-700 font-bold">Aadhar Card:</span>
                            <span className={`font-bold text-lg ${profile?.has_aadhar_card ? 'text-green-600' : 'text-gray-400'}`}>
                              {profile?.has_aadhar_card ? 'Yes ✓' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-green-100">
                            <span className="text-gray-700 font-bold">Passport:</span>
                            <span className={`font-bold text-lg ${profile?.has_passport ? 'text-green-600' : 'text-gray-400'}`}>
                              {profile?.has_passport ? 'Yes ✓' : 'No'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Backlogs */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl border-2 border-orange-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center">
                      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-2 mr-3">
                        <FileText size={20} className="text-white" />
                      </div>
                      Backlogs
                    </h4>

                    {backlogLocked && profile?.registration_status === 'approved' && (
                      <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Lock size={16} className="text-amber-600 flex-shrink-0" />
                        <p className="text-amber-800 text-sm font-medium">
                          Backlog fields are locked. Contact your placement officer to request an unlock window.
                        </p>
                      </div>
                    )}
                    {!backlogLocked && backlogUnlockEnd && profile?.registration_status === 'approved' && (
                      <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <Edit size={16} className="text-green-600 flex-shrink-0" />
                        <p className="text-green-800 text-sm font-medium">
                          Backlog editing is open until {new Date(backlogUnlockEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map(sem => (
                        <div key={sem}>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Semester {sem}</label>
                          {editMode && !(backlogLocked && profile?.registration_status === 'approved') ? (
                            <select
                              name={`backlogs_sem${sem}`}
                              value={formData[`backlogs_sem${sem}`]}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                            >
                              <option value="0">0</option>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={String(num)}>{num}</option>
                              ))}
                            </select>
                          ) : (
                            <p className={`text-gray-900 font-bold text-lg bg-white rounded-xl p-4 border border-gray-100 ${backlogLocked && editMode ? 'opacity-60' : ''}`}>
                              {profile?.[`backlogs_sem${sem}`] !== undefined ? profile[`backlogs_sem${sem}`] : '0'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-3 bg-white rounded-xl p-4 border border-orange-200">
                      <span className="text-sm font-bold text-gray-700">Total Backlogs:</span>
                      <span className={`text-2xl font-bold ${
                        (profile?.backlog_count > 0 || (parseInt(formData.backlogs_sem1) || 0) + (parseInt(formData.backlogs_sem2) || 0) + (parseInt(formData.backlogs_sem3) || 0) + (parseInt(formData.backlogs_sem4) || 0) + (parseInt(formData.backlogs_sem5) || 0) + (parseInt(formData.backlogs_sem6) || 0) > 0)
                          ? 'text-rose-600' : 'text-green-600'
                      }`}>
                        {editMode
                          ? (parseInt(formData.backlogs_sem1) || 0) + (parseInt(formData.backlogs_sem2) || 0) + (parseInt(formData.backlogs_sem3) || 0) + (parseInt(formData.backlogs_sem4) || 0) + (parseInt(formData.backlogs_sem5) || 0) + (parseInt(formData.backlogs_sem6) || 0)
                          : profile?.backlog_count || 0
                        }
                      </span>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Backlog Details</label>
                      {editMode && !(backlogLocked && profile?.registration_status === 'approved') ? (
                        <textarea
                          name="backlog_details"
                          value={formData.backlog_details}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                          placeholder="Specify subjects (if any)"
                          rows="2"
                        />
                      ) : (
                        <p className="text-gray-900 font-bold text-lg bg-white rounded-xl p-4 border border-gray-100">{profile?.backlog_details || 'None'}</p>
                      )}
                    </div>
                  </div>

                  {/* Photo */}
                  {profile?.photo_url && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                      <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2 mr-3">
                          <User size={20} className="text-white" />
                        </div>
                        Profile Photo
                      </h4>
                      <img
                        src={profile.photo_url}
                        alt="Profile"
                        className="w-40 h-40 object-cover rounded-2xl border-4 border-white shadow-xl"
                      />
                      <p className="text-sm text-gray-600 mt-3 font-medium">Photo cannot be changed after registration</p>
                    </div>
                  )}
                </div>
              </form>
            </GlassCard>
          </motion.div>

          {/* Extended Profile Summary Card */}
          {!extendedProfileLoading && extendedProfile?.profile && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.2 }}>
              <GlassCard className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                      Extended Profile Details
                    </h2>
                    <p className="text-gray-600 mt-2 font-medium">Additional information for job applications</p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/student/extended-profile"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2"
                    >
                      <Edit size={18} />
                      <span>Edit Extended Profile</span>
                    </Link>
                  </motion.div>
                </div>

                {/* Profile Completion Bar */}
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border-2 border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold text-gray-800">Profile Completion</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      {extendedProfile.profile.profile_completion_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${extendedProfile.profile.profile_completion_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(extendedProfile.profile.sslc_marks || extendedProfile.profile.twelfth_marks) && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 mr-3">
                          <GraduationCap className="text-white" size={22} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Academic Details</h3>
                      </div>
                      <div className="space-y-3">
                        {extendedProfile.profile.sslc_marks && (
                          <div className="bg-white rounded-xl p-3 border border-blue-100">
                            <span className="text-gray-600 font-semibold block mb-1">SSLC:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.sslc_marks}% ({extendedProfile.profile.sslc_board}, {extendedProfile.profile.sslc_year})</span>
                          </div>
                        )}
                        {extendedProfile.profile.twelfth_marks && (
                          <div className="bg-white rounded-xl p-3 border border-blue-100">
                            <span className="text-gray-600 font-semibold block mb-1">12th:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.twelfth_marks}% ({extendedProfile.profile.twelfth_board}, {extendedProfile.profile.twelfth_year})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(extendedProfile.profile.father_name || extendedProfile.profile.mother_name) && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl border-2 border-green-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2 mr-3">
                          <Users className="text-white" size={22} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Family Details</h3>
                      </div>
                      <div className="space-y-3">
                        {extendedProfile.profile.father_name && (
                          <div className="bg-white rounded-xl p-3 border border-green-100">
                            <span className="text-gray-600 font-semibold block mb-1">Father:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.father_name}</span>
                            {extendedProfile.profile.father_occupation && (
                              <span className="text-gray-600"> ({extendedProfile.profile.father_occupation})</span>
                            )}
                          </div>
                        )}
                        {extendedProfile.profile.mother_name && (
                          <div className="bg-white rounded-xl p-3 border border-green-100">
                            <span className="text-gray-600 font-semibold block mb-1">Mother:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.mother_name}</span>
                            {extendedProfile.profile.mother_occupation && (
                              <span className="text-gray-600"> ({extendedProfile.profile.mother_occupation})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(extendedProfile.profile.has_driving_license || extendedProfile.profile.has_pan_card || extendedProfile.profile.has_aadhar_card || extendedProfile.profile.has_passport) && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-purple-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2 mr-3">
                          <FileText className="text-white" size={22} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Documents</h3>
                      </div>
                      <div className="space-y-2">
                        {extendedProfile.profile.has_driving_license && (
                          <div className="flex items-center bg-white rounded-xl p-3 border border-purple-100">
                            <CheckCircle2 className="text-green-600 mr-3" size={20} />
                            <span className="text-gray-800 font-bold">Driving License</span>
                          </div>
                        )}
                        {extendedProfile.profile.has_pan_card && (
                          <div className="flex items-center bg-white rounded-xl p-3 border border-purple-100">
                            <CheckCircle2 className="text-green-600 mr-3" size={20} />
                            <span className="text-gray-800 font-bold">PAN Card</span>
                          </div>
                        )}
                        {extendedProfile.profile.has_aadhar_card && (
                          <div className="flex items-center bg-white rounded-xl p-3 border border-purple-100">
                            <CheckCircle2 className="text-green-600 mr-3" size={20} />
                            <span className="text-gray-800 font-bold">Aadhar Card</span>
                          </div>
                        )}
                        {extendedProfile.profile.has_passport && (
                          <div className="flex items-center bg-white rounded-xl p-3 border border-purple-100">
                            <CheckCircle2 className="text-green-600 mr-3" size={20} />
                            <span className="text-gray-800 font-bold">Passport</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(extendedProfile.profile.district || extendedProfile.profile.interests_hobbies) && (
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-5 rounded-2xl border-2 border-orange-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg p-2 mr-3">
                          <User className="text-white" size={22} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Personal Details</h3>
                      </div>
                      <div className="space-y-3">
                        {extendedProfile.profile.district && (
                          <div className="bg-white rounded-xl p-3 border border-orange-100">
                            <span className="text-gray-600 font-semibold block mb-1">District:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.district}</span>
                          </div>
                        )}
                        {extendedProfile.profile.interests_hobbies && (
                          <div className="bg-white rounded-xl p-3 border border-orange-100">
                            <span className="text-gray-600 font-semibold block mb-1">Interests:</span>
                            <span className="font-bold text-gray-900">{extendedProfile.profile.interests_hobbies}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Security & Info Card */}
        <div className="space-y-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.3 }}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-3">
                  <Shield className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Security
                </h2>
              </div>
              <div className="space-y-5">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl">
                  <div className="flex items-start">
                    <div className="bg-blue-500 rounded-lg p-2 mr-3">
                      <Lock className="text-white" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-2">Password</h4>
                      <p className="text-sm text-blue-800 font-medium">
                        Keep your account secure by using a strong password
                      </p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowChangePassword(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Lock size={20} />
                  <span>Change Password</span>
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Account Info */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.4 }}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-3">
                  <Calendar className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Account Information
                </h2>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-gray-600 font-semibold block mb-1">Role:</span>
                  <span className="text-gray-900 font-bold text-lg">Student</span>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-gray-600 font-semibold block mb-2">Registration Status:</span>
                  {getStatusBadge(profile?.registration_status)}
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-gray-600 font-semibold block mb-1">Registered On:</span>
                  <span className="text-gray-900 font-bold">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-gray-600 font-semibold block mb-1">Last Login:</span>
                  <span className="text-gray-900 font-bold">
                    {user?.last_login
                      ? new Date(user.last_login).toLocaleString('en-IN', {
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
          </motion.div>

          {/* Status Info */}
          {profile?.registration_status === 'pending' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.5 }}>
              <GlassCard className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-300">
                <h3 className="font-bold text-yellow-900 text-xl mb-2">Pending Approval</h3>
                <p className="text-yellow-800 font-medium">
                  Your registration is under review by your placement officer. You will receive access to job postings once approved.
                </p>
              </GlassCard>
            </motion.div>
          )}
          {profile?.registration_status === 'rejected' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.5 }}>
              <GlassCard className="p-6 bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-300">
                <h3 className="font-bold text-red-900 text-xl mb-2">Registration Rejected</h3>
                <p className="text-red-800 font-medium">
                  Please contact your placement officer for more information.
                </p>
              </GlassCard>
            </motion.div>
          )}
          {profile?.registration_status === 'blacklisted' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.5 }}>
              <GlassCard className="p-6 bg-gradient-to-r from-gray-700/20 to-gray-900/20 border-gray-600">
                <h3 className="font-bold text-gray-900 text-xl mb-2">Account Blacklisted</h3>
                <p className="text-gray-800 font-medium">
                  Your account has been restricted. Contact your placement officer for details.
                </p>
              </GlassCard>
            </motion.div>
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
