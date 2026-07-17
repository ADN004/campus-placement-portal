import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Reset Password — set a new password from an emailed link.
 *
 * The token arrives as ?token=... in the URL (the reset email points here).
 * Client-side we check the two fields match and meet the same rules the server
 * enforces; the server is the source of truth and its message is shown on any
 * rejection (e.g. expired/invalid token).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(token ? 'form' : 'no-token'); // form | success | no-token

  // Mirror of the server-side rules (authController.validatePasswordStrength).
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'One number', ok: /[0-9]/.test(password) },
  ];
  const allRulesOk = rules.every((r) => r.ok);
  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRulesOk) {
      toast.error('Please meet all password requirements');
      return;
    }
    if (!matches) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.resetPassword(token, password);
      setStatus('success');
      toast.success(res.data?.message || 'Password reset successfully');
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'no-token') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center p-8 shadow-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
              <XCircle className="text-red-600" size={44} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid reset link</h2>
            <p className="text-gray-700 mb-6">
              This link is missing its reset token. Please request a new password reset link.
            </p>
            <div className="space-y-3">
              <Link to="/forgot-password" className="btn btn-primary block w-full py-3">
                Request a new link
              </Link>
              <Link to="/login" className="btn btn-secondary block w-full py-3">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center p-8 shadow-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 animate-bounce">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Password reset!</h2>
            <p className="text-gray-700 mb-6">
              Your password has been updated. Redirecting you to login…
            </p>
            <Link to="/login" className="btn btn-primary inline-flex items-center justify-center gap-2 w-full py-3">
              <span>Go to Login</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <Lock className="text-white" size={30} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h2>
            <p className="text-gray-600 text-sm">Choose a strong password you don&rsquo;t use elsewhere.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="label">New password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input pr-12"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="label">Confirm new password</label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="input"
                required
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Requirement checklist */}
            <ul className="space-y-1.5">
              {rules.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-xs">
                  <CheckCircle
                    size={14}
                    className={r.ok ? 'text-green-600' : 'text-gray-300'}
                  />
                  <span className={r.ok ? 'text-gray-700' : 'text-gray-400'}>{r.label}</span>
                </li>
              ))}
            </ul>

            <button
              type="submit"
              disabled={loading || !allRulesOk || !matches}
              className="btn btn-primary w-full py-3"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
