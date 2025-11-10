import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function WaitingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <Clock className="text-yellow-600" size={40} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Registration Pending Approval
          </h1>

          <p className="text-gray-600 mb-6">
            Your registration is currently being reviewed by your placement officer.
            You will receive access to the portal once your registration is approved.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-left text-sm text-blue-900">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Your placement officer will review your details</li>
                  <li>You'll be notified via email once approved</li>
                  <li>After approval, you can access all features</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>Registered email: <span className="font-medium text-gray-700">{user.email}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
