import { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Building2, MapPin, Calendar, GraduationCap, AlertCircle, Lock, Edit, Save, X, BookOpen } from 'lucide-react';
import ChangePassword from '../../components/ChangePassword';

export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    date_of_birth: '',
    cgpa: '',
    backlog_count: '',
    backlog_details: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        mobile_number: profileData.mobile_number || '',
        date_of_birth: profileData.date_of_birth ? profileData.date_of_birth.split('T')[0] : '',
        cgpa: profileData.cgpa || '',
        backlog_count: profileData.backlog_count !== undefined ? profileData.backlog_count : '',
        backlog_details: profileData.backlog_details || '',
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

    if (!formData.name || !formData.mobile_number || !formData.date_of_birth || !formData.cgpa || formData.backlog_count === '') {
      toast.error('All fields are required');
      return;
    }

    // Validate CGPA
    const cgpaNum = parseFloat(formData.cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      toast.error('CGPA must be between 0 and 10');
      return;
    }

    // Validate backlog count
    const backlogNum = parseInt(formData.backlog_count);
    if (isNaN(backlogNum) || backlogNum < 0) {
      toast.error('Backlog count must be a non-negative number');
      return;
    }

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
      name: profile.name || '',
      mobile_number: profile.mobile_number || '',
      date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
      cgpa: profile.cgpa || '',
      backlog_count: profile.backlog_count !== undefined ? profile.backlog_count : '',
      backlog_details: profile.backlog_details || '',
    });
    setEditMode(false);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      blacklisted: { color: 'bg-gray-800 text-white', text: 'Blacklisted' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>{config.text}</span>;
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
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your full name"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.name || 'Not set'}</p>
                )}
              </div>

              {/* PRN (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <BookOpen size={18} className="mr-2" />
                  PRN Number
                </label>
                <p className="text-gray-900 font-medium">{profile?.prn}</p>
                <p className="text-xs text-gray-500 mt-1">PRN cannot be changed</p>
              </div>

              {/* Branch (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <GraduationCap size={18} className="mr-2" />
                  Branch/Department
                </label>
                <p className="text-gray-900 font-medium">{profile?.branch}</p>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="label flex items-center">
                  <Mail size={18} className="mr-2" />
                  Email Address
                </label>
                <p className="text-gray-900 font-medium">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="label flex items-center">
                  <Phone size={18} className="mr-2" />
                  Mobile Number <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your mobile number"
                    pattern="[0-9]{10}"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.mobile_number || 'Not set'}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="label flex items-center">
                  <Calendar size={18} className="mr-2" />
                  Date of Birth <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                )}
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

              {/* CGPA */}
              <div>
                <label className="label flex items-center">
                  <GraduationCap size={18} className="mr-2" />
                  CGPA <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="number"
                    name="cgpa"
                    value={formData.cgpa}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your CGPA (0-10)"
                    min="0"
                    max="10"
                    step="0.01"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.cgpa || 'Not set'}</p>
                )}
              </div>

              {/* Backlog Count */}
              <div>
                <label className="label flex items-center">
                  <AlertCircle size={18} className="mr-2" />
                  Backlog Count <span className="text-red-500 ml-1">*</span>
                </label>
                {editMode ? (
                  <input
                    type="number"
                    name="backlog_count"
                    value={formData.backlog_count}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter number of backlogs"
                    min="0"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.backlog_count !== undefined ? profile.backlog_count : 'Not set'}</p>
                )}
              </div>

              {/* Backlog Details */}
              <div>
                <label className="label flex items-center">
                  <AlertCircle size={18} className="mr-2" />
                  Backlog Details {formData.backlog_count > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                {editMode ? (
                  <textarea
                    name="backlog_details"
                    value={formData.backlog_details}
                    onChange={handleChange}
                    className="input"
                    placeholder="Specify subjects with backlogs (if any)"
                    rows="3"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{profile?.backlog_details || 'None'}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Leave blank if no backlogs</p>
              </div>
            </form>
          </div>
        </div>

        {/* Security & Info Card */}
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
                <span className="ml-2 font-medium text-gray-900">Student</span>
              </div>
              <div>
                <span className="text-gray-600">Registration Status:</span>
                <div className="mt-2">{getStatusBadge(profile?.registration_status)}</div>
              </div>
              <div>
                <span className="text-gray-600">Registered On:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
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

          {/* Status Info */}
          {profile?.registration_status === 'pending' && (
            <div className="card mt-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <h3 className="font-semibold text-yellow-900 mb-2">Pending Approval</h3>
              <p className="text-xs text-yellow-800">
                Your registration is under review by your placement officer. You will receive access to job postings once approved.
              </p>
            </div>
          )}
          {profile?.registration_status === 'rejected' && (
            <div className="card mt-6 bg-gradient-to-br from-red-50 to-red-100">
              <h3 className="font-semibold text-red-900 mb-2">Registration Rejected</h3>
              <p className="text-xs text-red-800">
                Please contact your placement officer for more information.
              </p>
            </div>
          )}
          {profile?.registration_status === 'blacklisted' && (
            <div className="card mt-6 bg-gradient-to-br from-gray-700 to-gray-800">
              <h3 className="font-semibold text-white mb-2">Account Blacklisted</h3>
              <p className="text-xs text-gray-200">
                Your account has been restricted. Contact your placement officer for details.
              </p>
            </div>
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
