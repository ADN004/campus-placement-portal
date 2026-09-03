import { useState, useMemo, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, Shield } from 'lucide-react';
import Modal from './Modal';
import { OFFICER_OVERLAY, officerPanel, OfficerDialogHeader } from './officer/OfficerDialog';
import { FIELD_CLASS } from './officer/OfficerUI';
import { ADMIN_OVERLAY, adminPanel, AdminDialogHeader } from './admin/AdminDialog';
import { FIELD_CLASS as ADMIN_FIELD_CLASS } from './admin/AdminUI';

/**
 * All three roles open this modal, so it takes a `variant`: 'spc' for the
 * student design system, 'officer', 'admin' for Console, and 'legacy' — the
 * original, now the default only because nothing passes it any more.
 *
 * Officer and super admin share every *colour* branch below: the spc tokens
 * resolve through whichever scope class is on the page, so one set of classes
 * is correct in both. That is what `themed` asks.
 *
 * They do not share *geometry*. The radii are fixed values in
 * `tailwind.config.js`, not scope-overridden custom properties, so reusing the
 * officer's `rounded-spc-control` (3px) under Console would hand this dialog
 * the officer's near-square corners — the exact mistake that once made the two
 * roles indistinguishable. Radius, field class and dialog shell are therefore
 * chosen per role rather than shared.
 */
export default function ChangePassword({ onClose, variant = 'legacy' }) {
  const spc = variant === 'spc';
  const officerVariant = variant === 'officer';
  const admin = variant === 'admin';
  const themed = officerVariant || admin;
  const rCtl = admin ? 'rounded-spc-admin-sm' : 'rounded-spc-control';
  const fieldBase = admin ? ADMIN_FIELD_CLASS : FIELD_CLASS;
  // Field and button classes, chosen once. The non-officer strings below are
  // the originals — global `.label` / `.input` / `.btn` — untouched.
  const labelCls = themed
    ? 'block text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-1.5 flex items-center'
    : 'label flex items-center';
  const inputCls = themed ? `${fieldBase} pr-10` : 'input pr-10';
  const { user, checkAuth } = useAuth();
  // Self-service reset covers students and super admins only — placement
  // officers sign in by phone and are reset by the super admin instead.
  const canSelfReset = user?.role === 'student' || user?.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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

  /**
   * Email the signed-in user a password reset link — the escape hatch for
   * someone who is logged in but no longer knows their current password.
   * Reuses the same public endpoint as the login page's "Forgot password?".
   */
  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await authAPI.forgotPassword(user.email);
      setResetSent(true);
    } catch (error) {
      // Rate limiting is the one failure worth surfacing; the endpoint is
      // otherwise generic by design, so anything else is treated as sent.
      if (error.response?.status === 429) {
        toast.error(error.response?.data?.message || 'Too many requests. Please try again shortly.');
      } else {
        setResetSent(true);
      }
    } finally {
      setResetLoading(false);
    }
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
      const res = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // The change now revokes every prior token; the backend reissues a fresh
      // one for this device. Store it so the Bearer header stops sending the
      // just-revoked token (the cookie is refreshed automatically).
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
      }

      toast.success('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Refresh the session so the "default password" warning banner clears
      // immediately instead of lingering until the next login.
      if (checkAuth) {
        checkAuth().catch(() => {});
      }

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
  /*
   * The strength meter keeps its red-to-green scale for the officer, because
   * that IS colour carrying meaning and the direction reserves colour for
   * exactly that. What changes is that it reads the role palette instead of raw
   * Tailwind, so it matches the reds and greens the rest of the officer role
   * already uses rather than introducing a second set.
   */
  const meterFill = themed
    ? (passwordStrength.level < 40 ? 'bg-spc-bad'
      : passwordStrength.level < 80 ? 'bg-spc-warn' : 'bg-spc-ok')
    : passwordStrength.color;
  const meterText = themed
    ? (passwordStrength.level < 40 ? 'text-spc-bad'
      : passwordStrength.level < 80 ? 'text-spc-warn' : 'text-spc-ok')
    : passwordStrength.textColor;

  const ValidationItem = ({ met, text }) => (
    <div className={`flex items-center space-x-2 transition-all duration-200 ${
      themed
        ? (met ? 'text-spc-xs text-spc-ok' : 'text-spc-xs text-spc-muted')
        : (met ? 'text-sm text-green-600' : 'text-sm text-gray-500')
    }`}>
      {met ? (
        <Check size={16} className="flex-shrink-0" />
      ) : (
        <X size={16} className="flex-shrink-0" />
      )}
      <span className={met ? 'font-medium' : ''}>{text}</span>
    </div>
  );

  return (
    <Modal
      onClose={onClose}
      labelledBy="change-password-title"
      overlayClassName={admin ? ADMIN_OVERLAY : officerVariant
        ? OFFICER_OVERLAY
        : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"}
      panelClassName={admin ? adminPanel('md', { scroll: true }) : officerVariant
        ? officerPanel('md', { scroll: true })
        : "bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain"}
    >
        {admin ? (
          <AdminDialogHeader
            onClose={onClose}
            id="change-password-title"
            title="Change password"
            subtitle="You will stay signed in on this device."
          />
        ) : officerVariant ? (
          <OfficerDialogHeader
            onClose={onClose}
            id="change-password-title"
            title="Change password"
            subtitle="You will stay signed in on this device."
          />
        ) : (
        <div className={`px-6 py-4 sticky top-0 z-10 rounded-t-2xl ${
          spc
            ? 'border-b border-spc-line bg-spc-surface'
            : 'border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          <h2 id="change-password-title" className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-3 text-blue-600" size={28} />
            Change Password
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a strong password to keep your account secure
          </p>
        </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className={labelCls}>
              <Lock size={16} className={themed ? 'mr-1.5 text-spc-muted' : 'mr-1.5 text-gray-500'} />
              Current Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className={themed
                  ? `absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 ${rCtl} text-spc-muted hover:text-spc-ink hover:bg-spc-surface-2 transition-colors`
                  : 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors'}
              >
                {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Escape hatch for a signed-in user who no longer knows their
                current password. Students/super admins can email themselves a
                reset link; officers aren't covered by self-service reset, so
                they're pointed at the super admin instead. */}
            <div className="mt-2">
              {canSelfReset ? (
                resetSent ? (
                  <div className={themed
                    ? `flex items-start gap-2 text-spc-xs text-spc-body bg-spc-ok-bg border border-spc-ok/40 ${rCtl} p-3`
                    : 'flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3'}>
                    <Check size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Reset link sent to <span className="font-medium">{user.email}</span>. It expires in
                      1 hour — open it to set a new password without needing your current one.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendResetLink}
                    disabled={resetLoading}
                    className={`text-sm font-semibold disabled:opacity-50 ${
                      spc ? 'text-spc-teal hover:underline underline-offset-4' : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    {resetLoading
                      ? 'Sending reset link…'
                      : 'Forgot your current password? Email me a reset link'}
                  </button>
                )
              ) : (
                <p className={themed ? 'text-spc-xs text-spc-body' : 'text-sm text-gray-500'}>
                  Forgot your current password? Contact your Super Admin to reset it.
                </p>
              )}
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className={labelCls}>
              <Lock size={16} className={themed ? 'mr-1.5 text-spc-muted' : 'mr-1.5 text-gray-500'} />
              New Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`${inputCls} ${
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
                className={themed
                  ? `absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 ${rCtl} text-spc-muted hover:text-spc-ink hover:bg-spc-surface-2 transition-colors`
                  : 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors'}
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={themed ? 'text-xs font-bold uppercase tracking-[0.11em] text-spc-muted' : 'text-xs font-medium text-gray-600'}>Password Strength:</span>
                  <span className={`text-xs font-bold ${meterText}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className={themed ? 'h-1.5 bg-spc-surface-3 rounded-spc-badge overflow-hidden' : 'h-2 bg-gray-200 rounded-full overflow-hidden'}>
                  <div
                    className={`h-full ${meterFill} transition-all duration-300 ease-out`}
                    style={{ width: `${passwordStrength.level}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className={themed
                ? `mt-4 p-4 ${rCtl} border border-spc-line-strong bg-spc-surface-2`
                : `mt-4 p-4 rounded-lg border ${passwordStrength.bgColor} ${passwordStrength.borderColor}`}>
                <div className="flex items-center mb-3">
                  <AlertCircle size={16} className={`mr-2 ${meterText}`} />
                  <span className={themed ? 'text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted' : 'text-sm font-semibold text-gray-700'}>Password Requirements</span>
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
            <label htmlFor="confirmPassword" className={labelCls}>
              <Lock size={16} className={themed ? 'mr-1.5 text-spc-muted' : 'mr-1.5 text-gray-500'} />
              Confirm New Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${inputCls} ${
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
                className={themed
                  ? `absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 ${rCtl} text-spc-muted hover:text-spc-ink hover:bg-spc-surface-2 transition-colors`
                  : 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors'}
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
              className={`flex-1 flex items-center justify-center space-x-2 ${
                officer
                  ? `min-h-[44px] px-4 ${rCtl} bg-spc-accent text-spc-on-accent text-spc-xs font-bold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`
                  : spc
                  ? 'min-h-[48px] px-5 rounded-spc-sm bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity disabled:opacity-50'
                  : 'btn btn-primary'
              }`}
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
              className={themed
                ? `flex-1 inline-flex items-center justify-center min-h-[44px] px-4 ${rCtl} bg-spc-surface-2 border border-spc-control text-spc-ink text-spc-xs font-bold hover:bg-spc-surface-3 transition-colors disabled:opacity-50`
                : 'btn btn-secondary flex-1'}
            >
              Cancel
            </button>
          </div>
        </form>
    </Modal>
  );
}
