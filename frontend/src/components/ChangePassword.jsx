import { useState, useMemo } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, Shield } from 'lucide-react';

export default function ChangePassword({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Password validation rules
  const passwordValidation = useMemo(() => {
    const password = formData.newPassword;
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [formData.newPassword]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = formData.newPassword;
    if (!password) return { level: 0, text: '', color: '' };

    let strength = 0;
    const checks = passwordValidation;

    // Basic requirements
    if (checks.minLength) strength += 20;
    if (checks.hasUppercase) strength += 20;
    if (checks.hasLowercase) strength += 20;
    if (checks.hasNumber) strength += 20;
    if (checks.hasSpecial) strength += 20;

    // Length bonus
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;

    // Determine strength level
    if (strength < 40) {
      return { level: strength, text: 'Weak', color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (strength < 60) {
      return { level: strength, text: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else if (strength < 80) {
      return { level: strength, text: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    } else if (strength < 100) {
      return { level: strength, text: 'Strong', color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    } else {
      return { level: strength, text: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    }
  }, [formData.newPassword, passwordValidation]);

  // Password match validation
  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.newPassword === formData.confirmPassword;
  }, [formData.newPassword, formData.confirmPassword]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Close modal after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Validation requirement component
  const ValidationItem = ({ met, text }) => (
    <div className={`flex items-center space-x-2 text-sm transition-all duration-200 ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? (
        <Check size={16} className="flex-shrink-0" />
      ) : (
        <X size={16} className="flex-shrink-0" />
      )}
      <span className={met ? 'font-medium' : ''}>{text}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-3 text-blue-600" size={28} />
            Change Password
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a strong password to keep your account secure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className="label flex items-center">
              <Lock size={16} className="mr-1.5 text-gray-500" />
              Current Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="input pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="label flex items-center">
              <Lock size={16} className="mr-1.5 text-gray-500" />
              New Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`input pr-10 ${
                  formData.newPassword && passwordStrength.level < 60
                    ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500'
                    : formData.newPassword && passwordStrength.level >= 60
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                    : ''
                }`}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Password Strength:</span>
                  <span className={`text-xs font-bold ${passwordStrength.textColor}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300 ease-out`}
                    style={{ width: `${passwordStrength.level}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className={`mt-4 p-4 rounded-lg border ${passwordStrength.bgColor} ${passwordStrength.borderColor}`}>
                <div className="flex items-center mb-3">
                  <AlertCircle size={16} className={`mr-2 ${passwordStrength.textColor}`} />
                  <span className="text-sm font-semibold text-gray-700">Password Requirements</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <ValidationItem met={passwordValidation.minLength} text="At least 8 characters" />
                  <ValidationItem met={passwordValidation.hasUppercase} text="One uppercase letter (A-Z)" />
                  <ValidationItem met={passwordValidation.hasLowercase} text="One lowercase letter (a-z)" />
                  <ValidationItem met={passwordValidation.hasNumber} text="One number (0-9)" />
                  <ValidationItem met={passwordValidation.hasSpecial} text="One special character (!@#$%...)" />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="label flex items-center">
              <Lock size={16} className="mr-1.5 text-gray-500" />
              Confirm New Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input pr-10 ${
                  passwordsMatch === true
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                    : passwordsMatch === false
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : ''
                }`}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.confirmPassword && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  {passwordsMatch === true ? (
                    <Check size={20} className="text-green-600" />
                  ) : passwordsMatch === false ? (
                    <X size={20} className="text-red-600" />
                  ) : null}
                </div>
              )}
            </div>

            {/* Password Match Feedback */}
            {formData.confirmPassword && (
              <div className="mt-2">
                {passwordsMatch === true ? (
                  <div className="flex items-center text-sm text-green-600">
                    <Check size={16} className="mr-1.5" />
                    <span className="font-medium">Passwords match</span>
                  </div>
                ) : passwordsMatch === false ? (
                  <div className="flex items-center text-sm text-red-600">
                    <X size={16} className="mr-1.5" />
                    <span className="font-medium">Passwords do not match</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Changing Password...</span>
                </>
              ) : (
                <>
                  <Shield size={18} />
                  <span>Change Password</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
