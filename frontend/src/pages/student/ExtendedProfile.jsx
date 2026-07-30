import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { GraduationCap, User, Users, FileText, Lightbulb, Activity } from 'lucide-react';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopExtendedProfile, {
  DesktopExtendedProfileSkeleton,
} from './extendedProfile/DesktopExtendedProfile';
import TabletExtendedProfile, {
  TabletExtendedProfileSkeleton,
} from './extendedProfile/TabletExtendedProfile';
import MobileExtendedProfile, {
  MobileExtendedProfileSkeleton,
} from './extendedProfile/MobileExtendedProfile';

/**
 * ExtendedProfile — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. The six section forms are the existing components in
 * components/extendedProfile, unchanged apart from styling.
 */
const ExtendedProfile = () => {
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('academic_extended');
  const [completion, setCompletion] = useState({ overall_completion: 0, sections: [] });
  const deviceType = useDeviceType();

  // Form states for each section
  const [academicForm, setAcademicForm] = useState({
    sslc_marks: '',
    sslc_year: '',
    sslc_board: '',
    twelfth_marks: '',
    twelfth_year: '',
    twelfth_board: ''
  });

  const [physicalForm, setPhysicalForm] = useState({
    height_cm: '',
    weight_kg: '',
    physically_handicapped: false,
    handicap_details: ''
  });

  const [familyForm, setFamilyForm] = useState({
    father_name: '',
    father_occupation: '',
    father_annual_income: '',
    mother_name: '',
    mother_occupation: '',
    mother_annual_income: '',
    siblings_count: 0,
    siblings_details: ''
  });

  const [personalForm, setPersonalForm] = useState({
    district: '',
    permanent_address: '',
    interests_hobbies: ''
  });

  const [documentForm, setDocumentForm] = useState({
    has_driving_license: false,
    has_pan_card: false,
    has_aadhar_card: false,
    has_passport: false
  });

  const [educationForm, setEducationForm] = useState({
    interested_in_btech: false,
    interested_in_mtech: false,
    not_interested_in_higher_education: false,
    preferred_study_mode: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchCompletion();
  }, []);

  // Skeleton loading gate
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Lock scroll during skeleton
  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/students/extended-profile');
      const profile = response.data.data.profile;

      setAcademicForm({
        sslc_marks: profile.sslc_marks ?? '',
        sslc_year: profile.sslc_year ?? '',
        sslc_board: profile.sslc_board ?? '',
        twelfth_marks: profile.twelfth_marks ?? '',
        twelfth_year: profile.twelfth_year ?? '',
        twelfth_board: profile.twelfth_board ?? ''
      });

      setPhysicalForm({
        height_cm: profile.height_cm ?? '',
        weight_kg: profile.weight_kg ?? '',
        physically_handicapped: profile.physically_handicapped ?? false,
        handicap_details: profile.handicap_details ?? ''
      });

      setFamilyForm({
        father_name: profile.father_name ?? '',
        father_occupation: profile.father_occupation ?? '',
        father_annual_income: profile.father_annual_income ?? '',
        mother_name: profile.mother_name ?? '',
        mother_occupation: profile.mother_occupation ?? '',
        mother_annual_income: profile.mother_annual_income ?? '',
        siblings_count: profile.siblings_count ?? 0,
        siblings_details: profile.siblings_details ?? ''
      });

      setPersonalForm({
        district: profile.district ?? '',
        permanent_address: profile.permanent_address ?? '',
        interests_hobbies: profile.interests_hobbies ?? ''
      });

      setDocumentForm({
        has_driving_license: profile.has_driving_license ?? false,
        has_pan_card: profile.has_pan_card ?? false,
        has_aadhar_card: profile.has_aadhar_card ?? false,
        has_passport: profile.has_passport ?? false
      });

      setEducationForm({
        interested_in_btech: profile.interested_in_btech ?? false,
        interested_in_mtech: profile.interested_in_mtech ?? false,
        not_interested_in_higher_education: profile.not_interested_in_higher_education ?? false,
        preferred_study_mode: profile.preferred_study_mode ?? ''
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load extended profile');
      setLoading(false);
    }
  };

  const fetchCompletion = async () => {
    try {
      const response = await api.get('/students/extended-profile/completion');
      setCompletion(response.data.data);
    } catch (error) {
      console.error('Error fetching completion:', error);
    }
  };

  const handleSaveSection = async (section) => {
    setSaving(true);
    try {
      let formData;
      switch (section) {
        case 'academic_extended':
          formData = academicForm;
          break;
        case 'physical_details':
          formData = physicalForm;
          break;
        case 'family_details':
          formData = familyForm;
          break;
        case 'personal_details':
          formData = personalForm;
          break;
        case 'document_verification':
          formData = documentForm;
          break;
        case 'education_preferences':
          formData = educationForm;
          break;
      }

      const endpoint = section === 'academic_extended' ? 'academic'
        : section === 'physical_details' ? 'physical'
        : section === 'family_details' ? 'family'
        : section === 'personal_details' ? 'personal'
        : section === 'document_verification' ? 'documents'
        : 'education-preferences';

      await api.put(`/students/extended-profile/${endpoint}`, formData);
      toast.success('Section saved successfully');
      await fetchCompletion();
      await fetchProfile();
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error(error.response?.data?.message || 'Failed to update section');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      id: 'academic_extended',
      name: 'Academic',
      icon: GraduationCap,
      description: 'SSLC and 12th details',
    },
    {
      id: 'physical_details',
      name: 'Physical details',
      icon: Activity,
      description: 'Height, weight and physical status',
    },
    {
      id: 'family_details',
      name: 'Family details',
      icon: Users,
      description: 'Parents and siblings',
    },
    {
      id: 'personal_details',
      name: 'Personal details',
      icon: User,
      description: 'District, address, interests',
    },
    {
      id: 'document_verification',
      name: 'Documents',
      icon: FileText,
      description: 'PAN, Aadhaar, passport',
    },
    {
      id: 'education_preferences',
      name: 'Education plans',
      icon: Lightbulb,
      description: 'Higher education preferences',
    }
  ];

  const getSectionCompletion = (sectionId) => {
    const section = completion.sections.find(s => s.section_name === sectionId);
    return section ? section.completion_percentage : 0;
  };

  const getSectionStatus = (sectionId) => {
    const section = completion.sections.find(s => s.section_name === sectionId);
    return section?.is_completed || false;
  };

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileExtendedProfileSkeleton />;
    if (deviceType === 'tablet') return <TabletExtendedProfileSkeleton />;
    return <DesktopExtendedProfileSkeleton />;
  }

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    completion,
    sections,
    activeSection,
    onSelectSection: setActiveSection,
    getSectionCompletion,
    getSectionStatus,
    academicForm,
    setAcademicForm,
    physicalForm,
    setPhysicalForm,
    familyForm,
    setFamilyForm,
    personalForm,
    setPersonalForm,
    documentForm,
    setDocumentForm,
    educationForm,
    setEducationForm,
    onSave: handleSaveSection,
    saving,
  };

  if (deviceType === 'mobile') return <MobileExtendedProfile {...presenterProps} />;
  if (deviceType === 'tablet') return <TabletExtendedProfile {...presenterProps} />;
  return <DesktopExtendedProfile {...presenterProps} />;
};

export default ExtendedProfile;
