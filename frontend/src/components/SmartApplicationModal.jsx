import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import {
  X,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader,
  AlertTriangle,
  User,
  FileText,
  Home,
  Users,
  CreditCard,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import GlassCard from './GlassCard';
import AcademicExtendedSection from './extendedProfile/AcademicExtendedSection';
import PhysicalDetailsSection from './extendedProfile/PhysicalDetailsSection';
import FamilyDetailsSection from './extendedProfile/FamilyDetailsSection';
import PersonalDetailsSection from './extendedProfile/PersonalDetailsSection';
import DocumentVerificationSection from './extendedProfile/DocumentVerificationSection';
import EducationPreferencesSection from './extendedProfile/EducationPreferencesSection';

/**
 * Smart Application Modal
 *
 * This modal implements the 3-Tier Hybrid Approach:
 * - Checks Tier 1 (core eligibility) - already done by backend
 * - Validates Tier 2 (extended profile) - collects missing data
 * - Collects Tier 3 (custom fields) - job-specific questions
 */
export default function SmartApplicationModal({ job, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [readinessData, setReadinessData] = useState(null);
  const [currentStep, setCurrentStep] = useState('check'); // check, collect, submit
  const [formData, setFormData] = useState({});
  const [customFieldResponses, setCustomFieldResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [missingBySection, setMissingBySection] = useState({});
  const [sectionForms, setSectionForms] = useState({
    academic_extended: {},
    physical_details: {},
    family_details: {},
    personal_details: {},
    document_verification: {},
    education_preferences: {}
  });
  const [sectionsToShow, setSectionsToShow] = useState([]);

  useEffect(() => {
    checkReadiness();
  }, [job.id]);

  const checkReadiness = async () => {
    try {
      setLoading(true);

      // CRITICAL FIX: Fetch full extended profile data first
      const profileResponse = await studentAPI.getExtendedProfile();
      const profile = profileResponse.data.data.profile;

      const response = await studentAPI.checkApplicationReadiness(job.id);
      const data = response.data;

      setReadinessData(data);

      // Initialize section forms with FULL extended profile data
      const newSectionForms = {
        academic_extended: {
          sslc_marks: profile.sslc_marks ?? '',
          sslc_year: profile.sslc_year ?? '',
          sslc_board: profile.sslc_board ?? '',
          twelfth_marks: profile.twelfth_marks ?? '',
          twelfth_year: profile.twelfth_year ?? '',
          twelfth_board: profile.twelfth_board ?? ''
        },
        physical_details: {
          height_cm: profile.height_cm ?? '',
          weight_kg: profile.weight_kg ?? '',
          physically_handicapped: profile.physically_handicapped ?? false,
          handicap_details: profile.handicap_details ?? ''
        },
        family_details: {
          father_name: profile.father_name ?? '',
          father_occupation: profile.father_occupation ?? '',
          father_annual_income: profile.father_annual_income ?? '',
          mother_name: profile.mother_name ?? '',
          mother_occupation: profile.mother_occupation ?? '',
          mother_annual_income: profile.mother_annual_income ?? '',
          siblings_count: profile.siblings_count ?? 0,
          siblings_details: profile.siblings_details ?? ''
        },
        personal_details: {
          district: profile.district ?? '',
          permanent_address: profile.permanent_address ?? '',
          interests_hobbies: profile.interests_hobbies ?? ''
        },
        document_verification: {
          has_driving_license: profile.has_driving_license ?? false,
          has_pan_card: profile.has_pan_card ?? false,
          has_aadhar_card: profile.has_aadhar_card ?? false,
          has_passport: profile.has_passport ?? false
        },
        education_preferences: {
          interested_in_btech: profile.interested_in_btech ?? false,
          interested_in_mtech: profile.interested_in_mtech ?? false,
          not_interested_in_higher_education: profile.not_interested_in_higher_education ?? false,
          preferred_study_mode: profile.preferred_study_mode ?? ''
        }
      };

      // Organize missing fields by section
      const sections = {};
      const sectionsWithMissingFields = [];

      if (data.missing_fields) {
        data.missing_fields.forEach(field => {
          if (!sections[field.section]) {
            sections[field.section] = [];
          }
          sections[field.section].push(field);

          // Track which sections have missing fields
          if (field.section !== 'core' && !sectionsWithMissingFields.includes(field.section)) {
            sectionsWithMissingFields.push(field.section);
          }
        });
      }
      setMissingBySection(sections);
      setSectionForms(newSectionForms);
      setSectionsToShow(sectionsWithMissingFields);

      // Initialize custom field responses
      if (data.custom_fields) {
        const responses = {};
        data.custom_fields.forEach(field => {
          responses[field.field_name] = '';
        });
        setCustomFieldResponses(responses);
      }

      // Determine next step
      if (data.ready_to_apply && (!data.custom_fields || data.custom_fields.length === 0)) {
        setCurrentStep('submit');
      } else if (data.has_blocking_issues) {
        setCurrentStep('blocked');
      } else {
        setCurrentStep('collect');
      }
    } catch (error) {
      toast.error('Failed to check application readiness');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomFieldChange = (fieldName, value) => {
    setCustomFieldResponses(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleGoToExtendedProfile = () => {
    navigate('/student/extended-profile');
    onClose();
  };

  const getSectionComponent = (sectionId) => {
    const components = {
      academic_extended: AcademicExtendedSection,
      physical_details: PhysicalDetailsSection,
      family_details: FamilyDetailsSection,
      personal_details: PersonalDetailsSection,
      document_verification: DocumentVerificationSection,
      education_preferences: EducationPreferencesSection
    };
    return components[sectionId];
  };

  const handleSectionUpdate = (sectionId, data) => {
    setSectionForms(prev => ({
      ...prev,
      [sectionId]: data
    }));
  };

  const handleSubmitApplication = async () => {
    // Validate required custom fields
    if (readinessData?.custom_fields) {
      const missingRequired = readinessData.custom_fields.filter(
        field => field.required && !customFieldResponses[field.field_name]
      );
      if (missingRequired.length > 0) {
        toast.error('Please fill all required fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Flatten all section forms into tier2_data
      const tier2_data = {};
      sectionsToShow.forEach(sectionId => {
        Object.assign(tier2_data, sectionForms[sectionId]);
      });

      console.log('=== SUBMITTING APPLICATION ===');
      console.log('Sections to show:', sectionsToShow);
      console.log('Section forms:', sectionForms);
      console.log('Flattened tier2_data:', tier2_data);
      console.log('tier2_data keys:', Object.keys(tier2_data));
      console.log('tier2_data values:', Object.values(tier2_data));

      const applicationData = {
        tier2_data,
        tier3_custom_responses: customFieldResponses,
        sections_filled: sectionsToShow
      };

      console.log('Application data being sent:', applicationData);

      await studentAPI.applyEnhanced(job.id, applicationData);

      toast.success(sectionsToShow.length > 0
        ? 'Application submitted and profile updated successfully!'
        : 'Application submitted successfully!');

      // Redirect to Google Form if available
      if (job.application_form_url) {
        window.open(job.application_form_url, '_blank');
      }

      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to submit application';

      // Check if error is due to validation failure (specific field requirements not met)
      if (errorMessage.includes('Application rejected:')) {
        // Show detailed validation error
        toast.error(errorMessage.replace('Application rejected: ', ''), {
          duration: 8000,
          style: {
            maxWidth: '500px'
          }
        });

        // Close modal and refresh to show updated eligibility
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 2000);
      } else {
        // Show generic error
        toast.error(errorMessage);
      }

      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getSectionIcon = (sectionName) => {
    const icons = {
      physical_details: User,
      family_details: Users,
      personal_details: Home,
      documents: CreditCard,
      academic_extended: GraduationCap,
      education_preferences: FileText,
    };
    return icons[sectionName] || FileText;
  };

  const getSectionTitle = (sectionName) => {
    const titles = {
      physical_details: 'Physical Details',
      family_details: 'Family Details',
      personal_details: 'Personal Details',
      documents: 'Document Verification',
      academic_extended: 'Academic Extended',
      education_preferences: 'Education Preferences',
    };
    return titles[sectionName] || sectionName;
  };

  const renderFieldInput = (field) => {
    const fieldValue = formData[field.field] || '';

    // Determine input type based on field name
    if (field.field_type === 'boolean' || field.field.includes('has_') || field.field.includes('is_')) {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={field.field}
            checked={fieldValue === true || fieldValue === 'true'}
            onChange={(e) => handleFieldChange(field.field, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={field.field} className="text-sm text-gray-700">
            {field.label}
          </label>
        </div>
      );
    }

    if (field.field.includes('year')) {
      return (
        <input
          type="number"
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.field, e.target.value)}
          placeholder={field.label}
          min="1950"
          max={new Date().getFullYear()}
          className="input"
        />
      );
    }

    if (field.field.includes('marks') || field.field.includes('percentage')) {
      return (
        <input
          type="number"
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.field, e.target.value)}
          placeholder={field.label}
          min="0"
          max="100"
          step="0.01"
          className="input"
        />
      );
    }

    if (field.field.includes('height') || field.field.includes('weight')) {
      return (
        <input
          type="number"
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.field, e.target.value)}
          placeholder={field.label}
          min="0"
          step="0.01"
          className="input"
        />
      );
    }

    if (field.field.includes('district') || field.field.includes('state')) {
      return (
        <input
          type="text"
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.field, e.target.value)}
          placeholder={field.label}
          className="input"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={fieldValue}
        onChange={(e) => handleFieldChange(field.field, e.target.value)}
        placeholder={field.label}
        className="input"
      />
    );
  };

  const renderCustomFieldInput = (customField) => {
    const value = customFieldResponses[customField.field_name] || '';

    switch (customField.field_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={customField.field_name}
              checked={value === true || value === 'true' || value === 'yes'}
              onChange={(e) => handleCustomFieldChange(customField.field_name, e.target.checked ? 'yes' : 'no')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={customField.field_name} className="text-sm text-gray-700">
              Yes
            </label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(customField.field_name, e.target.value)}
            placeholder={customField.field_label}
            className="input"
            required={customField.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleCustomFieldChange(customField.field_name, e.target.value)}
            placeholder={customField.field_label}
            rows="3"
            className="input"
            required={customField.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleCustomFieldChange(customField.field_name, e.target.value)}
            placeholder={customField.field_label}
            className="input"
            required={customField.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="mt-4 text-gray-600">Checking application requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Apply for {job.title}</h2>
            <p className="text-sm text-gray-600">{job.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Blocked State */}
          {currentStep === 'blocked' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-red-900">Application Blocked</h3>
                  <p className="text-sm text-red-800 mt-1">
                    You do not meet the eligibility criteria for this job.
                  </p>
                </div>
              </div>

              {readinessData?.missing_fields?.filter(f => f.blocking).map((field, index) => (
                <div key={index} className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900">{field.label}</p>
                      <p className="text-sm text-red-800 mt-1">{field.message}</p>
                      {field.current_value && field.required_value && (
                        <div className="mt-2 text-xs bg-white rounded px-2 py-1 inline-block">
                          <span className="text-gray-600">Your value: </span>
                          <span className="font-semibold text-red-700">{field.current_value}</span>
                          <span className="text-gray-600"> | Required: </span>
                          <span className="font-semibold text-green-700">{field.required_value}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Note:</span> These requirements cannot be changed.
                  Please apply for other jobs that match your profile.
                </p>
              </div>

              <button onClick={onClose} className="btn btn-secondary w-full">
                Close
              </button>
            </div>
          )}

          {/* Data Collection Step */}
          {currentStep === 'collect' && (
            <div className="space-y-6">
              {/* Missing Fields Section */}
              {Object.keys(missingBySection).length > 0 && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <h3 className="font-semibold text-blue-900">Additional Information Required</h3>
                        <p className="text-sm text-blue-800 mt-1">
                          This job requires some additional information that you haven't filled in your profile yet.
                          You can fill it here, or go to your Extended Profile to complete it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoToExtendedProfile}
                    className="btn btn-secondary w-full mb-4 flex items-center justify-center space-x-2"
                  >
                    <ExternalLink size={16} />
                    <span>Go to Extended Profile</span>
                  </button>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 mb-4">Or fill the required information here:</p>

                    {sectionsToShow.map((sectionId, index) => {
                      const SectionComponent = getSectionComponent(sectionId);
                      if (!SectionComponent) return null;

                      return (
                        <div key={sectionId} className={index > 0 ? 'mt-6' : ''}>
                          <GlassCard className="p-6">
                            <SectionComponent
                              formData={sectionForms[sectionId] || {}}
                              setFormData={(dataOrUpdater) => {
                                // Handle both direct data objects and updater functions
                                if (typeof dataOrUpdater === 'function') {
                                  setSectionForms(prev => ({
                                    ...prev,
                                    [sectionId]: dataOrUpdater(prev[sectionId] || {})
                                  }));
                                } else {
                                  handleSectionUpdate(sectionId, dataOrUpdater);
                                }
                              }}
                              onSave={() => {}} // No individual save in modal
                              saving={false}
                              isCompleted={false}
                              mode="compact"
                            />
                          </GlassCard>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Fields Section */}
              {readinessData?.custom_fields && readinessData.custom_fields.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-purple-900 flex items-center space-x-2">
                      <FileText size={20} />
                      <span>Company-Specific Questions</span>
                    </h3>
                    <p className="text-sm text-purple-800 mt-1">
                      Please answer the following questions specific to this job application.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {readinessData.custom_fields.map((customField, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {customField.field_label}
                          {customField.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderCustomFieldInput(customField)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApplication}
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {/* Ready to Submit */}
          {currentStep === 'submit' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-green-900">Ready to Apply!</h3>
                  <p className="text-sm text-green-800 mt-1">
                    You meet all the requirements for this job. Click submit to complete your application.
                  </p>
                </div>
              </div>

              {job.application_form_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    After submitting, you'll be redirected to the company's Google Form to complete additional details.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                This action will mark you as applied and cannot be undone.
              </p>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApplication}
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
