import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

/**
 * Forgot Password — request a reset link.
 *
 * Works for students and super admins (identified by their email). The backend
 * always responds the same way whether or not the email is registered, so this
 * page shows one generic confirmation and never reveals whether an account
 * exists. Placement officers are not covered here — they reset via the super
 * admin.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
    } catch (error) {
      // Intentionally ignored: the endpoint is generic by design, so we show
      // the same confirmation regardless of outcome (rate-limit 429 aside,
      // which the message below still covers gracefully).
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card p-8 shadow-lg">
          {submitted ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="text-green-600" size={44} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
              <p className="text-gray-700 mb-6">
                If an account with that email exists, we&rsquo;ve sent a password reset link.
                The link expires in 1 hour.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  Didn&rsquo;t get it? Check your spam folder, make sure you entered the email
                  linked to your account, or try again in a few minutes.
                </p>
              </div>
              <Link to="/login" className="btn btn-primary inline-flex items-center justify-center gap-2 w-full py-3">
                <ArrowLeft size={18} />
                <span>Back to Login</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                  <KeyRound className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
                <p className="text-gray-600 text-sm">
                  Enter your email and we&rsquo;ll send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input pl-10"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-3"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Placement officers: contact your Super Admin to reset your password.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
