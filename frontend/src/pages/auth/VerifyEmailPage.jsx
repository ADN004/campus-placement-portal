import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(response.data.message || 'Your email has been verified successfully!');
      setEmail(response.data.data?.email || '');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      const errorData = error.response?.data;
      setMessage(errorData?.message || 'Failed to verify email. The link may be invalid or expired.');

      // Set email if available for resend option
      if (errorData?.data?.email) {
        setEmail(errorData.data.email);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address not available. Please contact support.');
      return;
    }

    try {
      await authAPI.resendVerification(email);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center p-8">
            <LoadingSpinner />
            <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-6">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center p-8 shadow-lg">
          {status === 'success' ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 animate-bounce">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Email Verified!</h2>
              <p className="text-gray-700 mb-6 text-lg">Your email has been successfully verified.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  Your account is now active. You can log in to access the State Placement Cell portal.
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-4 italic">
                Redirecting to login page in 3 seconds...
              </p>
              <Link to="/login" className="btn btn-primary inline-flex items-center space-x-2 px-6 py-3">
                <span>Go to Login</span>
                <ArrowRight size={18} />
              </Link>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <XCircle className="text-red-600" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Verification Failed</h2>
              <p className="text-gray-700 mb-6">{message}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-800 mb-2 font-semibold">
                  Common reasons:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>The verification link has expired (valid for 24 hours)</li>
                  <li>The link has already been used</li>
                  <li>Your email is already verified</li>
                </ul>
              </div>

              {email && (
                <div className="mb-6">
                  <button
                    onClick={handleResendVerification}
                    className="btn btn-secondary inline-flex items-center space-x-2 px-6 py-3 w-full justify-center"
                  >
                    <Mail size={18} />
                    <span>Send New Verification Link</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    A new verification link will be sent to {email}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Link to="/login" className="btn btn-primary inline-block w-full py-3">
                  Back to Login
                </Link>
                <p className="text-sm text-gray-500">
                  Need help? Contact your placement officer or administrator.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
