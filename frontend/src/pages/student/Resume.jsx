import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import api from '../../services/api';
import useDeviceType from '../../hooks/useDeviceType';
import {
  MobileResume,
  TabletResume,
  DesktopResume,
  MobileResumeSkeleton,
  TabletResumeSkeleton,
  DesktopResumeSkeleton,
} from './resume/ResumePresenters';

/**
 * StudentResume — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. The nine sections live in resume/resumeSections so the add,
 * update and remove wiring exists in one place rather than three.
 */
export default function StudentResume() {
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    objective: true,
    skills: true,
    address: true,
    projects: false,
    experience: false,
    certifications: false,
    achievements: false,
    extracurricular: false,
    custom: false
  });
  const [extendedProfileAddress, setExtendedProfileAddress] = useState('');
  const deviceType = useDeviceType();

  const [resumeData, setResumeData] = useState({
    career_objective: '',
    technical_skills: [],
    soft_skills: [],
    languages_known: [],
    projects: [],
    work_experience: [],
    certifications: [],
    achievements: [],
    extracurricular_activities: [],
    declaration_text: 'I hereby declare that the above-mentioned information is true to the best of my knowledge.',
    custom_sections: [],
    address: '',
    has_custom_content: false
  });

  // Temp inputs for array items
  const [tempInputs, setTempInputs] = useState({
    technical_skill: '',
    soft_skill: '',
    language: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  useEffect(() => {
    fetchResume();
    fetchExtendedProfileAddress();
  }, []);

  const fetchExtendedProfileAddress = async () => {
    try {
      const response = await api.get('/students/extended-profile');
      const ep = response.data.data?.profile;
      if (ep?.permanent_address) {
        setExtendedProfileAddress(ep.permanent_address);
      }
    } catch {
      // ignore
    }
  };

  const fetchResume = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getResume();
      if (response.data.data) {
        const data = response.data.data;
        setResumeData({
          career_objective: data.career_objective || '',
          technical_skills: data.technical_skills || [],
          soft_skills: data.soft_skills || [],
          languages_known: data.languages_known || [],
          projects: data.projects || [],
          work_experience: data.work_experience || [],
          certifications: data.certifications || [],
          achievements: data.achievements || [],
          extracurricular_activities: data.extracurricular_activities || [],
          declaration_text: data.declaration_text || 'I hereby declare that the above-mentioned information is true to the best of my knowledge.',
          custom_sections: data.custom_sections || [],
          address: data.address || '',
          has_custom_content: data.has_custom_content || false
        });
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await studentAPI.updateResume(resumeData);
      toast.success('Resume saved successfully!');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to save resume');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Check which mandatory sections are missing
  const getMissingSections = () => {
    const missing = [];
    if (!resumeData.career_objective) missing.push('Career Objective');
    if (!resumeData.technical_skills || resumeData.technical_skills.length === 0) missing.push('Skills');
    if (!resumeData.projects || resumeData.projects.length === 0) missing.push('Projects');
    if (!resumeData.work_experience || resumeData.work_experience.length === 0) missing.push('Work Experience / Internship');
    if (!resumeData.address && !extendedProfileAddress) missing.push('Address');
    return missing;
  };

  const canDownload = getMissingSections().length === 0;

  const handleDownload = async () => {
    const missing = getMissingSections();
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.join(', ')}`);
      return;
    }
    setDownloading(true);
    try {
      const response = await studentAPI.downloadResume();

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'My_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to download resume';
      toast.error(msg);
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Array field handlers
  const addToArray = (field, value) => {
    if (!value.trim()) return;
    setResumeData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
  };

  const removeFromArray = (field, index) => {
    setResumeData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Project handlers
  const addProject = () => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', description: '', technologies: '', duration: '' }]
    }));
  };

  const updateProject = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const removeProject = (index) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  // Work experience handlers
  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      work_experience: [...prev.work_experience, { company: '', role: '', duration: '', description: '' }]
    }));
  };

  const updateExperience = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      work_experience: prev.work_experience.map((e, i) => i === index ? { ...e, [field]: value } : e)
    }));
  };

  const removeExperience = (index) => {
    setResumeData(prev => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index)
    }));
  };

  // Certification handlers
  const addCertification = () => {
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', year: '' }]
    }));
  };

  const updateCertification = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const removeCertification = (index) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  // Achievement handlers
  const addAchievement = () => {
    setResumeData(prev => ({
      ...prev,
      achievements: [...prev.achievements, { title: '', description: '', year: '' }]
    }));
  };

  const updateAchievement = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      achievements: prev.achievements.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const removeAchievement = (index) => {
    setResumeData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  // Extracurricular handlers
  const addExtracurricular = () => {
    setResumeData(prev => ({
      ...prev,
      extracurricular_activities: [...prev.extracurricular_activities, '']
    }));
  };

  const updateExtracurricular = (index, value) => {
    setResumeData(prev => ({
      ...prev,
      extracurricular_activities: prev.extracurricular_activities.map((e, i) => i === index ? value : e)
    }));
  };

  const removeExtracurricular = (index) => {
    setResumeData(prev => ({
      ...prev,
      extracurricular_activities: prev.extracurricular_activities.filter((_, i) => i !== index)
    }));
  };

  // Custom section handlers
  const addCustomSection = () => {
    setResumeData(prev => ({
      ...prev,
      custom_sections: [...prev.custom_sections, { title: '', content: '' }]
    }));
  };

  const updateCustomSection = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeCustomSection = (index) => {
    setResumeData(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.filter((_, i) => i !== index)
    }));
  };

  // Named for passing to the presenters — same calls as the inline handler it
  // replaces: leave edit mode and reload, discarding unsaved edits.
  const handleCancel = () => {
    setEditMode(false);
    fetchResume();
  };

  const handleEdit = () => setEditMode(true);

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileResumeSkeleton />;
    if (deviceType === 'tablet') return <TabletResumeSkeleton />;
    return <DesktopResumeSkeleton />;
  }

  const actionProps = {
    canDownload,
    missingSections: getMissingSections(),
    downloading,
    editMode,
    saving,
    onDownload: handleDownload,
    onEdit: handleEdit,
    onSave: handleSave,
    onCancel: handleCancel,
  };

  const sectionProps = {
    resumeData,
    setResumeData,
    editMode,
    expandedSections,
    onToggle: toggleSection,
    tempInputs,
    setTempInputs,
    extendedProfileAddress,
    handlers: {
      addToArray,
      removeFromArray,
      addProject,
      updateProject,
      removeProject,
      addExperience,
      updateExperience,
      removeExperience,
      addCertification,
      updateCertification,
      removeCertification,
      addAchievement,
      updateAchievement,
      removeAchievement,
      addExtracurricular,
      updateExtracurricular,
      removeExtracurricular,
      addCustomSection,
      updateCustomSection,
      removeCustomSection,
    },
  };

  if (deviceType === 'mobile') return <MobileResume actionProps={actionProps} sectionProps={sectionProps} />;
  if (deviceType === 'tablet') return <TabletResume actionProps={actionProps} sectionProps={sectionProps} />;
  return <DesktopResume actionProps={actionProps} sectionProps={sectionProps} />;
}
