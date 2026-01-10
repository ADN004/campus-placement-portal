import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  GraduationCap,
  User,
  Users,
  FileText,
  Lightbulb,
  CheckCircle,
  Loader,
  Activity
} from 'lucide-react';
import GradientOrb from '../../components/GradientOrb';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import AcademicExtendedSection from '../../components/extendedProfile/AcademicExtendedSection';
import PhysicalDetailsSection from '../../components/extendedProfile/PhysicalDetailsSection';
import FamilyDetailsSection from '../../components/extendedProfile/FamilyDetailsSection';
import PersonalDetailsSection from '../../components/extendedProfile/PersonalDetailsSection';
import DocumentVerificationSection from '../../components/extendedProfile/DocumentVerificationSection';
import EducationPreferencesSection from '../../components/extendedProfile/EducationPreferencesSection';

const ExtendedProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('academic_extended');
  const [completion, setCompletion] = useState({ overall_completion: 0, sections: [] });

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

  const fetchProfile = async () => {
    try {
      const response = await api.get('/students/extended-profile');
      const profile = response.data.data.profile;

      // Populate forms
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
      await fetchProfile(); // Refresh profile data
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
      name: 'Academic Extended',
      icon: GraduationCap,
      description: 'SSLC and 12th details',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'physical_details',
      name: 'Physical Details',
      icon: Activity,
      description: 'Height, weight, and physical status',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'family_details',
      name: 'Family Details',
      icon: Users,
      description: 'Parents and siblings information',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'personal_details',
      name: 'Personal Details',
      icon: User,
      description: 'District, address, interests',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'document_verification',
      name: 'Documents',
      icon: FileText,
      description: 'PAN, Aadhar, Passport',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'education_preferences',
      name: 'Education Preferences',
      icon: Lightbulb,
      description: 'Higher education preferences',
      gradient: 'from-yellow-500 to-orange-600'
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <GradientOrb color="blue" position="top-right" />
      <GradientOrb color="indigo" position="bottom-left" delay="2s" />
      <GradientOrb color="purple" position="center" delay="4s" />

      {/* Header */}
      <div className="mb-8">
        <DashboardHeader
          icon={FileText}
          title="Extended Profile"
          subtitle="Complete your profile to apply for jobs that require additional information"
        />
      </div>

      {/* Overall Completion Card */}
      <GlassCard className="p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Completion</h2>
              <p className="text-gray-600 font-medium">
                Fill at least one field in each section to complete your profile
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Higher field completion percentage increases your job match accuracy
              </p>
            </div>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - completion.overall_completion / 100)}`}
                    className="text-blue-600 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {completion.overall_completion}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Sections</h3>
              <div className="space-y-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const completionPercentage = getSectionCompletion(section.id);
                  const isComplete = getSectionStatus(section.id);

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg'
                          : 'bg-white/50 border-2 border-white/20 hover:bg-white/80 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`bg-gradient-to-br ${section.gradient} rounded-xl p-2.5 shadow-lg flex-shrink-0`}>
                            <Icon className="text-white" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm mb-0.5 ${
                              activeSection === section.id ? 'text-blue-900' : 'text-gray-800'
                            }`}>
                              {section.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{section.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isComplete
                              ? 'text-green-700 bg-green-100'
                              : 'text-blue-600 bg-blue-100'
                          }`}>
                            {completionPercentage}%
                          </span>
                          {isComplete && (
                            <div className="bg-green-500 rounded-full p-1.5">
                              <CheckCircle className="text-white" size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </div>

        {/* Section Content */}
        <div className="lg:col-span-2">
          <GlassCard className="p-8">
              {activeSection === 'academic_extended' && (
                <AcademicExtendedSection
                  formData={academicForm}
                  setFormData={setAcademicForm}
                  onSave={() => handleSaveSection('academic_extended')}
                  saving={saving}
                  isCompleted={getSectionStatus('academic_extended')}
                />
              )}

              {activeSection === 'physical_details' && (
                <PhysicalDetailsSection
                  formData={physicalForm}
                  setFormData={setPhysicalForm}
                  onSave={() => handleSaveSection('physical_details')}
                  saving={saving}
                  isCompleted={getSectionStatus('physical_details')}
                />
              )}

              {activeSection === 'family_details' && (
                <FamilyDetailsSection
                  formData={familyForm}
                  setFormData={setFamilyForm}
                  onSave={() => handleSaveSection('family_details')}
                  saving={saving}
                  isCompleted={getSectionStatus('family_details')}
                />
              )}

              {activeSection === 'personal_details' && (
                <PersonalDetailsSection
                  formData={personalForm}
                  setFormData={setPersonalForm}
                  onSave={() => handleSaveSection('personal_details')}
                  saving={saving}
                  isCompleted={getSectionStatus('personal_details')}
                />
              )}

              {activeSection === 'document_verification' && (
                <DocumentVerificationSection
                  formData={documentForm}
                  setFormData={setDocumentForm}
                  onSave={() => handleSaveSection('document_verification')}
                  saving={saving}
                  isCompleted={getSectionStatus('document_verification')}
                />
              )}

              {activeSection === 'education_preferences' && (
                <EducationPreferencesSection
                  formData={educationForm}
                  setFormData={setEducationForm}
                  onSave={() => handleSaveSection('education_preferences')}
                  saving={saving}
                  isCompleted={getSectionStatus('education_preferences')}
                />
              )}
            </GlassCard>
          </div>
        </div>
    </div>
  );
};

export default ExtendedProfile;
