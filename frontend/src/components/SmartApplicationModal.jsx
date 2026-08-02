import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import useDeviceType from '../hooks/useDeviceType';
import {
  BlockedBody,
  CollectBody,
  ExternalFormBody,
  SubmitBody,
} from './student/apply/applyShared';
import { MobileApply, TabletApply, DesktopApply } from './student/apply/ApplyPresenters';

/**
 * Smart Application Modal — container.
 *
 * This modal implements the 3-Tier Hybrid Approach:
 * - Checks Tier 1 (core eligibility) - already done by backend
 * - Validates Tier 2 (extended profile) - collects missing data
 * - Collects Tier 3 (custom fields) - job-specific questions
 *
 * All state, data fetching and handlers live here. The three device shells in
 * ./student/apply/ApplyPresenters receive identical props and call these same
 * handlers, so the flow behaves the same on a phone as on a desktop.
 */
export default function SmartApplicationModal({ job, onClose, onSuccess }) {
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const [loading, setLoading] = useState(true);
  const [readinessData, setReadinessData] = useState(null);
  const [currentStep, setCurrentStep] = useState('check'); // check, collect, external_form, submit
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

  // External form tracking states
  const [externalFormOpened, setExternalFormOpened] = useState(false);
  const [formCompletionAcknowledged, setFormCompletionAcknowledged] = useState(false);

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
      if (data.has_blocking_issues) {
        setCurrentStep('blocked');
      } else if (sectionsWithMissingFields.length > 0 || (data.custom_fields && data.custom_fields.length > 0)) {
        // Need to collect Tier 2 or Tier 3 data first
        setCurrentStep('collect');
      } else if (job.application_form_url) {
        // Has external form - must complete it before submitting
        setCurrentStep('external_form');
      } else {
        setCurrentStep('submit');
      }
    } catch (error) {
      toast.error('Failed to check application readiness');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  // Function to open external form in new tab
  const handleOpenExternalForm = () => {
    if (job.application_form_url) {
      window.open(job.application_form_url, '_blank');
      setExternalFormOpened(true);
    }
  };

  // Section components hand back either a new object or an updater function.
  const handleSectionChange = (sectionId, dataOrUpdater) => {
    if (typeof dataOrUpdater === 'function') {
      setSectionForms(prev => ({
        ...prev,
        [sectionId]: dataOrUpdater(prev[sectionId] || {})
      }));
    } else {
      setSectionForms(prev => ({
        ...prev,
        [sectionId]: dataOrUpdater
      }));
    }
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

      const applicationData = {
        tier2_data,
        tier3_custom_responses: customFieldResponses,
        sections_filled: sectionsToShow
      };

      await studentAPI.applyEnhanced(job.id, applicationData);

      toast.success(sectionsToShow.length > 0
        ? 'Application submitted and profile updated successfully!'
        : 'Application submitted successfully!');

      // Note: External form is now handled in the external_form step before submission
      // No need to open it again here

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

  if (loading) {
    return (
      <Modal
        title="Checking application requirements"
        closeOnEscape={false}
        overlayClassName="fixed inset-0 z-50 bg-spc-ink/55 backdrop-blur-sm flex items-center justify-center p-6"
        panelClassName="bg-spc-surface rounded-spc-lg border border-spc-line shadow-2xl px-8 py-9 text-center outline-none"
      >
        <Loader className="animate-spin text-spc-teal mx-auto" size={40} />
        <p className="mt-4 text-spc-sm font-semibold text-spc-ink">
          Checking what this job needs…
        </p>
        <p className="mt-1 text-spc-xs text-spc-muted">One moment.</p>
      </Modal>
    );
  }

  /* ------------------------------------------------------------- body */

  const dense = deviceType === 'mobile';
  let body = null;

  if (currentStep === 'blocked') {
    body = <BlockedBody readinessData={readinessData} />;
  } else if (currentStep === 'collect') {
    body = (
      <CollectBody
        dense={dense}
        hasMissingSections={Object.keys(missingBySection).length > 0}
        sectionsToShow={sectionsToShow}
        sectionForms={sectionForms}
        onSectionChange={handleSectionChange}
        customFields={readinessData?.custom_fields}
        customFieldResponses={customFieldResponses}
        onCustomFieldChange={handleCustomFieldChange}
        onGoToExtendedProfile={handleGoToExtendedProfile}
      />
    );
  } else if (currentStep === 'external_form') {
    body = (
      <ExternalFormBody
        dense={dense}
        externalFormOpened={externalFormOpened}
        onOpenExternalForm={handleOpenExternalForm}
        formCompletionAcknowledged={formCompletionAcknowledged}
        onAcknowledgeChange={setFormCompletionAcknowledged}
      />
    );
  } else if (currentStep === 'submit') {
    body = <SubmitBody />;
  }

  /* ----------------------------------------------------------- actions */

  let primary = null;
  let secondary = { label: 'Cancel', disabled: submitting };

  if (currentStep === 'blocked') {
    secondary = { label: 'Close', disabled: false };
  } else if (currentStep === 'collect') {
    primary = job.application_form_url
      ? { label: 'Continue to the company form', onClick: () => setCurrentStep('external_form'), disabled: false }
      : { label: submitting ? 'Submitting…' : 'Submit application', onClick: handleSubmitApplication, disabled: submitting };
  } else if (currentStep === 'external_form') {
    secondary = { label: 'Cancel', disabled: false };
    primary = {
      label: submitting ? 'Submitting…' : 'Submit application',
      onClick: handleSubmitApplication,
      disabled: !formCompletionAcknowledged || submitting,
    };
  } else if (currentStep === 'submit') {
    primary = {
      label: submitting ? 'Submitting…' : 'Confirm & submit',
      onClick: handleSubmitApplication,
      disabled: submitting,
    };
  }

  /* -------------------------------------------------------------- flow */

  // Only a genuinely two-screen flow gets a step rail. Showing one for a
  // single screen, or on the blocked dead end, would be inventing progress.
  const needsCollection =
    sectionsToShow.length > 0 || (readinessData?.custom_fields?.length || 0) > 0;
  const flow =
    currentStep !== 'blocked' && needsCollection && job.application_form_url
      ? [
          { key: 'collect', label: 'Your details' },
          { key: 'external_form', label: 'Company form' },
        ]
      : null;

  const presenterProps = { job, body, flow, currentStep, primary, secondary, onClose };

  if (deviceType === 'mobile') return <MobileApply {...presenterProps} />;
  if (deviceType === 'tablet') return <TabletApply {...presenterProps} />;
  return <DesktopApply {...presenterProps} />;
}
