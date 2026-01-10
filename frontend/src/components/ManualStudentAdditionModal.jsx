import React, { useState, useEffect } from 'react';
import { X, User, AlertTriangle, CheckCircle, Building2, Briefcase, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ManualStudentAdditionModal = ({
  isOpen,
  onClose,
  job,
  onSuccess,
  api, // Pass either superAdminAPI or placementOfficerAPI
  userRole = 'placement-officer' // 'placement-officer' or 'super-admin'
}) => {
  const [step, setStep] = useState(1); // 1: Enter PRN, 2: Confirm & Fill Details
  const [prn, setPrn] = useState('');
  const [collegeId, setCollegeId] = useState(null); // For super admin with multiple PRN matches
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    placement_package: '',
    joining_date: '',
    placement_location: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1);
      setPrn('');
      setCollegeId(null);
      setStudentData(null);
      setValidationResult(null);
      setFormData({
        placement_package: job?.salary_package || '',
        joining_date: '',
        placement_location: '',
        notes: '',
      });
    }
  }, [isOpen, job]);

  const handleValidate = async () => {
    if (!prn.trim()) {
      toast.error('Please enter a student PRN');
      return;
    }

    try {
      setValidating(true);
      const payload = {
        student_prn: prn.trim(),
        job_id: job.id,
      };

      // Super admin can specify college_id if known
      if (userRole === 'super-admin' && collegeId) {
        payload.college_id = collegeId;
      }

      const response = await api.validateStudentForManualAddition(payload);
      const data = response.data.data;

      // Check if disambiguation is needed (super admin only)
      if (response.data.requires_disambiguation) {
        setValidationResult({
          type: 'disambiguation',
          students: response.data.students,
        });
        return;
      }

      // Check if student can be added
      if (!data.can_add) {
        toast.error('Student cannot be added. See warnings below.');
        setValidationResult(data);
        return;
      }

      // Success - move to step 2
      setStudentData(data.student);
      setValidationResult(data);
      setStep(2);
      toast.success('Student validated successfully!');
    } catch (error) {
      console.error('Validation error:', error);
      const message = error.response?.data?.message || 'Failed to validate student';
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };

  const handleCollegeSelect = (selectedCollegeId) => {
    setCollegeId(selectedCollegeId);
    setValidationResult(null);
    handleValidate();
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.notes.trim()) {
      toast.error('Please provide notes explaining why this student is being manually added');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        job_id: job.id,
        student_prn: prn.trim(),
        placement_package: formData.placement_package || null,
        joining_date: formData.joining_date || null,
        placement_location: formData.placement_location || null,
        notes: formData.notes,
      };

      // Super admin may need to specify college_id
      if (userRole === 'super-admin' && studentData.college_id) {
        payload.college_id = studentData.college_id;
      }

      const response = await api.manuallyAddStudentToJob(payload);

      // Check for warnings
      if (response.data.data.warning) {
        toast.success(`Student added successfully! Warning: ${response.data.data.warning}`, {
          duration: 5000,
        });
      } else {
        toast.success('Student manually added to job successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      const message = error.response?.data?.message || 'Failed to add student to job';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manually Add Student</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add student who didn't apply but got selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Job Info Banner */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <Building2 className="text-blue-600 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{job.company_name}</h3>
              <p className="text-sm text-gray-600">{job.job_role}</p>
              <p className="text-sm text-gray-600 mt-1">Package: {job.salary_package} LPA</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            // Step 1: Enter PRN
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student PRN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
                  placeholder="Enter student PRN (e.g., PES1UG21CS001)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={validating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the PRN of the student who needs to be added manually
                </p>
              </div>

              {/* Disambiguation - Multiple students found */}
              {validationResult?.type === 'disambiguation' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Multiple Students Found
                      </h4>
                      <p className="text-sm text-gray-700 mb-3">
                        Multiple students found with PRN "{prn}". Please select the correct college:
                      </p>
                      <div className="space-y-2">
                        {validationResult.students.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => handleCollegeSelect(student.college_id)}
                            className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-600">
                              {student.college_name} ({student.college_code}) - {student.branch}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warnings/Errors */}
              {validationResult && !validationResult.can_add && validationResult.type !== 'disambiguation' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 mt-1" size={20} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Cannot Add Student</h4>
                      {validationResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-sm text-gray-700">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Preview */}
              {validationResult?.can_add && validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Warnings</h4>
                      {validationResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-sm text-gray-700">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Step 2: Confirm & Fill Placement Details
            <div className="space-y-6">
              {/* Student Info Card */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1" size={20} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Student Validated</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{studentData.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">PRN:</span>
                        <span className="ml-2 font-medium">{studentData.prn}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Branch:</span>
                        <span className="ml-2 font-medium">{studentData.branch}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">CGPA:</span>
                        <span className="ml-2 font-medium">{studentData.cgpa}</span>
                      </div>
                      {userRole === 'super-admin' && (
                        <div className="col-span-2">
                          <span className="text-gray-600">College:</span>
                          <span className="ml-2 font-medium">{studentData.college_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings if any */}
              {validationResult?.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Warnings</h4>
                      {validationResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-sm text-gray-700">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Placement Details Form */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Placement Details</h4>

                {/* Package */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline mr-1" size={16} />
                    Placement Package (LPA)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.placement_package}
                    onChange={(e) => setFormData({ ...formData, placement_package: e.target.value })}
                    placeholder="e.g., 5.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use job's package ({job.salary_package} LPA)
                  </p>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline mr-1" size={16} />
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline mr-1" size={16} />
                    Placement Location
                  </label>
                  <input
                    type="text"
                    value={formData.placement_location}
                    onChange={(e) => setFormData({ ...formData, placement_location: e.target.value })}
                    placeholder="e.g., Bangalore, Hyderabad"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Notes (Required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline mr-1" size={16} />
                    Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Explain why this student is being manually added (e.g., 'Company allowed students with 1 backlog during on-campus drive')"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required: Explain the reason for manual addition
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={validating || !prn.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {validating ? 'Validating...' : 'Validate Student'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep(1);
                  setStudentData(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.notes.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Adding...' : 'Add Student'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualStudentAdditionModal;
