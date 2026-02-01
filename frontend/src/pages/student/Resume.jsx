import { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileText, Download, Save, Plus, Trash2, Edit, X, Check, Briefcase,
  Code, Users, Award, BookOpen, Target, ChevronDown, ChevronUp, MapPin, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import GradientOrb from '../../components/GradientOrb';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function StudentResume() {
  const [loading, setLoading] = useState(true);
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

  if (loading) return <LoadingSpinner />;

  const SectionHeader = ({ title, icon: Icon, section, color = 'blue' }) => (
    <button
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-4 bg-gradient-to-r from-${color}-50 to-${color}-100 rounded-xl border-2 border-${color}-200 hover:from-${color}-100 hover:to-${color}-200 transition-all`}
    >
      <div className="flex items-center gap-3">
        <div className={`bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-lg p-2`}>
          <Icon className="text-white" size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      {expandedSections[section] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
  );

  return (
    <div>
      <GradientOrb color="blue" position="top-right" />
      <GradientOrb color="indigo" position="bottom-left" delay="2s" />
      <GradientOrb color="purple" position="center" delay="4s" />

      {/* Header */}
      <div className="mb-8">
        <DashboardHeader
          icon={FileText}
          title="My Resume"
          subtitle="Build and customize your professional resume"
        />
      </div>

      {/* Action Buttons */}
      <GlassCard className="p-6 mb-6">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading || !canDownload}
              className={`font-bold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${canDownload ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl' : 'bg-gray-300 text-gray-500'}`}
            >
              <Download size={18} />
              <span>{downloading ? 'Downloading...' : 'Download Resume'}</span>
            </button>
          </div>
          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    fetchResume();
                  }}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <Edit size={18} />
                <span>Edit Resume</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 mt-4 text-sm">
          Your resume includes your profile data along with all the sections you've added below.
        </p>
        {!canDownload && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-sm font-bold">Complete these mandatory sections to enable download:</p>
              <ul className="text-amber-700 text-sm mt-1 list-disc list-inside">
                {getMissingSections().map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="space-y-4">
        {/* Career Objective */}
        <GlassCard className="p-6">
          <SectionHeader title="Career Objective" icon={Target} section="objective" color="blue" />
          {expandedSections.objective && (
            <div className="mt-4">
              {editMode ? (
                <textarea
                  value={resumeData.career_objective}
                  onChange={(e) => setResumeData(prev => ({ ...prev, career_objective: e.target.value }))}
                  placeholder="Write a compelling career objective that highlights your goals and what you bring to the table..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium resize-none"
                  rows={4}
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {resumeData.career_objective || 'No career objective set. Click "Edit Resume" to add one.'}
                </p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Address */}
        <GlassCard className="p-6">
          <SectionHeader title="Address" icon={MapPin} section="address" color="emerald" />
          {expandedSections.address && (
            <div className="mt-4">
              {editMode ? (
                <div>
                  <textarea
                    value={resumeData.address}
                    onChange={(e) => setResumeData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your complete address for the resume..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium resize-none"
                    rows={3}
                  />
                  {!resumeData.address && extendedProfileAddress && (
                    <button
                      onClick={() => setResumeData(prev => ({ ...prev, address: extendedProfileAddress }))}
                      className="mt-2 text-sm text-emerald-600 hover:text-emerald-800 font-medium underline"
                    >
                      Use address from Extended Profile: "{extendedProfileAddress.substring(0, 60)}{extendedProfileAddress.length > 60 ? '...' : ''}"
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    {resumeData.address || extendedProfileAddress || 'No address set. Click "Edit Resume" to add one.'}
                  </p>
                  {!resumeData.address && extendedProfileAddress && (
                    <p className="text-xs text-gray-500 mt-1 italic">Using address from Extended Profile</p>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Skills */}
        <GlassCard className="p-6">
          <SectionHeader title="Skills" icon={Code} section="skills" color="indigo" />
          {expandedSections.skills && (
            <div className="mt-4 space-y-6">
              {/* Technical Skills */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3">Technical Skills</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {resumeData.technical_skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">
                      {skill}
                      {editMode && (
                        <button onClick={() => removeFromArray('technical_skills', index)} className="hover:text-red-600">
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {editMode && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempInputs.technical_skill}
                      onChange={(e) => setTempInputs(prev => ({ ...prev, technical_skill: e.target.value }))}
                      placeholder="Add a technical skill (e.g., Python, React)"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('technical_skills', tempInputs.technical_skill);
                          setTempInputs(prev => ({ ...prev, technical_skill: '' }));
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addToArray('technical_skills', tempInputs.technical_skill);
                        setTempInputs(prev => ({ ...prev, technical_skill: '' }));
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Soft Skills */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3">Soft Skills</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {resumeData.soft_skills.map((skill, index) => (
                    <span key={index} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">
                      {skill}
                      {editMode && (
                        <button onClick={() => removeFromArray('soft_skills', index)} className="hover:text-red-600">
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {editMode && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempInputs.soft_skill}
                      onChange={(e) => setTempInputs(prev => ({ ...prev, soft_skill: e.target.value }))}
                      placeholder="Add a soft skill (e.g., Leadership, Communication)"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('soft_skills', tempInputs.soft_skill);
                          setTempInputs(prev => ({ ...prev, soft_skill: '' }));
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addToArray('soft_skills', tempInputs.soft_skill);
                        setTempInputs(prev => ({ ...prev, soft_skill: '' }));
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Languages */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3">Languages Known</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {resumeData.languages_known.map((lang, index) => (
                    <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">
                      {lang}
                      {editMode && (
                        <button onClick={() => removeFromArray('languages_known', index)} className="hover:text-red-600">
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {editMode && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempInputs.language}
                      onChange={(e) => setTempInputs(prev => ({ ...prev, language: e.target.value }))}
                      placeholder="Add a language (e.g., English, Hindi, Malayalam)"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('languages_known', tempInputs.language);
                          setTempInputs(prev => ({ ...prev, language: '' }));
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addToArray('languages_known', tempInputs.language);
                        setTempInputs(prev => ({ ...prev, language: '' }));
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Projects */}
        <GlassCard className="p-6">
          <SectionHeader title="Projects" icon={BookOpen} section="projects" color="orange" />
          {expandedSections.projects && (
            <div className="mt-4 space-y-4">
              {resumeData.projects.map((project, index) => (
                <div key={index} className="bg-orange-50 p-4 rounded-xl border-2 border-orange-200">
                  {editMode ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={project.title}
                          onChange={(e) => updateProject(index, 'title', e.target.value)}
                          placeholder="Project Title"
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-orange-500 outline-none font-bold"
                        />
                        <button onClick={() => removeProject(index)} className="ml-2 text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={project.technologies}
                        onChange={(e) => updateProject(index, 'technologies', e.target.value)}
                        placeholder="Technologies used (e.g., React, Node.js, MongoDB)"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-orange-500 outline-none"
                      />
                      <textarea
                        value={project.description}
                        onChange={(e) => updateProject(index, 'description', e.target.value)}
                        placeholder="Project description..."
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-orange-500 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-800">{project.title || 'Untitled Project'}</h4>
                      {project.technologies && (
                        <p className="text-sm text-orange-600 font-medium mt-1">{project.technologies}</p>
                      )}
                      {project.description && (
                        <p className="text-gray-600 mt-2">{project.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addProject}
                  className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Project
                </button>
              )}
              {!editMode && resumeData.projects.length === 0 && (
                <p className="text-gray-500 text-center py-4">No projects added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Work Experience */}
        <GlassCard className="p-6">
          <SectionHeader title="Work Experience / Internships" icon={Briefcase} section="experience" color="teal" />
          {expandedSections.experience && (
            <div className="mt-4 space-y-4">
              {resumeData.work_experience.map((exp, index) => (
                <div key={index} className="bg-teal-50 p-4 rounded-xl border-2 border-teal-200">
                  {editMode ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateExperience(index, 'role', e.target.value)}
                          placeholder="Role/Position"
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-teal-500 outline-none font-bold"
                        />
                        <button onClick={() => removeExperience(index)} className="ml-2 text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          placeholder="Company Name"
                          className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-teal-500 outline-none"
                        />
                        <input
                          type="text"
                          value={exp.duration}
                          onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                          placeholder="Duration (e.g., June 2025 - Aug 2025)"
                          className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-teal-500 outline-none"
                        />
                      </div>
                      <textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(index, 'description', e.target.value)}
                        placeholder="Describe your role and responsibilities..."
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-teal-500 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-800">{exp.role || 'Role not specified'}</h4>
                      <p className="text-sm text-teal-600 font-medium mt-1">
                        {exp.company}{exp.duration && ` | ${exp.duration}`}
                      </p>
                      {exp.description && (
                        <p className="text-gray-600 mt-2">{exp.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addExperience}
                  className="w-full py-3 border-2 border-dashed border-teal-300 rounded-xl text-teal-600 font-bold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Work Experience / Internship
                </button>
              )}
              {!editMode && resumeData.work_experience.length === 0 && (
                <p className="text-gray-500 text-center py-4">No work experience added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Certifications */}
        <GlassCard className="p-6">
          <SectionHeader title="Certifications" icon={Award} section="certifications" color="yellow" />
          {expandedSections.certifications && (
            <div className="mt-4 space-y-4">
              {resumeData.certifications.map((cert, index) => (
                <div key={index} className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                  {editMode ? (
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={cert.name}
                          onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          placeholder="Certification Name"
                          className="col-span-2 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-yellow-500 outline-none"
                        />
                        <input
                          type="text"
                          value={cert.year}
                          onChange={(e) => updateCertification(index, 'year', e.target.value)}
                          placeholder="Year"
                          className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-yellow-500 outline-none"
                        />
                        <input
                          type="text"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                          placeholder="Issuing Organization"
                          className="col-span-3 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <button onClick={() => removeCertification(index)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-800">{cert.name || 'Certification name not specified'}</h4>
                      <p className="text-sm text-yellow-700 font-medium mt-1">
                        {cert.issuer}{cert.year && ` (${cert.year})`}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addCertification}
                  className="w-full py-3 border-2 border-dashed border-yellow-300 rounded-xl text-yellow-600 font-bold hover:bg-yellow-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Certification
                </button>
              )}
              {!editMode && resumeData.certifications.length === 0 && (
                <p className="text-gray-500 text-center py-4">No certifications added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Achievements */}
        <GlassCard className="p-6">
          <SectionHeader title="Achievements & Awards" icon={Award} section="achievements" color="pink" />
          {expandedSections.achievements && (
            <div className="mt-4 space-y-4">
              {resumeData.achievements.map((ach, index) => (
                <div key={index} className="bg-pink-50 p-4 rounded-xl border-2 border-pink-200">
                  {editMode ? (
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={ach.title}
                            onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                            placeholder="Achievement Title"
                            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-pink-500 outline-none"
                          />
                          <input
                            type="text"
                            value={ach.year}
                            onChange={(e) => updateAchievement(index, 'year', e.target.value)}
                            placeholder="Year"
                            className="w-24 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-pink-500 outline-none"
                          />
                        </div>
                        <textarea
                          value={ach.description}
                          onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-pink-500 outline-none resize-none"
                          rows={2}
                        />
                      </div>
                      <button onClick={() => removeAchievement(index)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-800">{ach.title || 'Achievement not specified'}</h4>
                      {ach.year && <p className="text-sm text-pink-600 font-medium mt-1">{ach.year}</p>}
                      {ach.description && <p className="text-gray-600 mt-2">{ach.description}</p>}
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addAchievement}
                  className="w-full py-3 border-2 border-dashed border-pink-300 rounded-xl text-pink-600 font-bold hover:bg-pink-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Achievement
                </button>
              )}
              {!editMode && resumeData.achievements.length === 0 && (
                <p className="text-gray-500 text-center py-4">No achievements added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Extracurricular */}
        <GlassCard className="p-6">
          <SectionHeader title="Extracurricular Activities" icon={Users} section="extracurricular" color="cyan" />
          {expandedSections.extracurricular && (
            <div className="mt-4 space-y-3">
              {resumeData.extracurricular_activities.map((activity, index) => (
                <div key={index} className="flex gap-2">
                  {editMode ? (
                    <>
                      <input
                        type="text"
                        value={activity}
                        onChange={(e) => updateExtracurricular(index, e.target.value)}
                        placeholder="Activity description"
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
                      />
                      <button onClick={() => removeExtracurricular(index)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={20} />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 bg-cyan-50 px-4 py-2 rounded-xl w-full">
                      <Check className="text-cyan-600" size={18} />
                      <span>{activity}</span>
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addExtracurricular}
                  className="w-full py-3 border-2 border-dashed border-cyan-300 rounded-xl text-cyan-600 font-bold hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Activity
                </button>
              )}
              {!editMode && resumeData.extracurricular_activities.length === 0 && (
                <p className="text-gray-500 text-center py-4">No activities added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Custom Sections */}
        <GlassCard className="p-6">
          <SectionHeader title="Custom Sections" icon={FileText} section="custom" color="gray" />
          {expandedSections.custom && (
            <div className="mt-4 space-y-4">
              {resumeData.custom_sections.map((section, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  {editMode ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateCustomSection(index, 'title', e.target.value)}
                          placeholder="Section Title"
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-gray-500 outline-none font-bold"
                        />
                        <button onClick={() => removeCustomSection(index)} className="ml-2 text-red-600 hover:text-red-800">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateCustomSection(index, 'content', e.target.value)}
                        placeholder="Section content..."
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-gray-500 outline-none resize-none"
                        rows={3}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-800">{section.title || 'Untitled Section'}</h4>
                      <p className="text-gray-600 mt-2 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {editMode && (
                <button
                  onClick={addCustomSection}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Custom Section
                </button>
              )}
              {!editMode && resumeData.custom_sections.length === 0 && (
                <p className="text-gray-500 text-center py-4">No custom sections added yet.</p>
              )}
            </div>
          )}
        </GlassCard>

        {/* Declaration */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Declaration</h3>
          {editMode ? (
            <textarea
              value={resumeData.declaration_text}
              onChange={(e) => setResumeData(prev => ({ ...prev, declaration_text: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none resize-none"
              rows={2}
            />
          ) : (
            <p className="text-gray-700 italic">{resumeData.declaration_text}</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
