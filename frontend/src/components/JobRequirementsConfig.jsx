import { useState, useEffect } from 'react';
import { Info, Plus, Trash2, Star } from 'lucide-react';
import { placementOfficerAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Job Requirements Configuration Component
 *
 * Allows Placement Officers to configure job requirements including:
 * - Tier 2 extended profile requirements
 * - Specific field requirements with min/max
 * - Custom company-specific fields
 * - Template selection
 */
const JobRequirementsConfig = ({ jobId, onRequirementsSaved, initialData = null }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [requirements, setRequirements] = useState({
    min_cgpa: initialData?.min_cgpa || '',
    max_backlogs: initialData?.max_backlogs !== null && initialData?.max_backlogs !== undefined ? String(initialData.max_backlogs) : '',
    backlog_policy: initialData?.max_backlogs === null || initialData?.max_backlogs === undefined ? 'no_restriction' : initialData?.max_backlogs === 0 ? 'no_backlogs' : 'limited',
    allowed_backlog_semesters: Array.isArray(initialData?.allowed_backlog_semesters) ? initialData.allowed_backlog_semesters.map(Number) : [],
    allowed_branches: initialData?.allowed_branches || [],
    requires_academic_extended: initialData?.requires_academic_extended || false,
    requires_physical_details: initialData?.requires_physical_details || false,
    requires_family_details: initialData?.requires_family_details || false,
    requires_document_verification: initialData?.requires_document_verification || false,
    requires_education_preferences: initialData?.requires_education_preferences || false,
    specific_field_requirements: initialData?.specific_field_requirements || {},
    custom_fields: initialData?.custom_fields || []
  });

  const [newCustomField, setNewCustomField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    required: true,
    options: []
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await placementOfficerAPI.getRequirementTemplates();
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleApplyTemplate = async (templateId) => {
    try {
      const response = await placementOfficerAPI.getRequirementTemplates();
      const template = response.data.data.find(t => t.id === parseInt(templateId));

      if (template) {
        setRequirements({
          min_cgpa: template.min_cgpa || '',
          max_backlogs: template.max_backlogs !== null && template.max_backlogs !== undefined ? String(template.max_backlogs) : '',
          backlog_policy: template.max_backlogs === null || template.max_backlogs === undefined ? 'no_restriction' : template.max_backlogs === 0 ? 'no_backlogs' : 'limited',
          allowed_backlog_semesters: Array.isArray(template.allowed_backlog_semesters) ? template.allowed_backlog_semesters.map(Number) : [],
          allowed_branches: template.allowed_branches || [],
          requires_academic_extended: template.requires_academic_extended || false,
          requires_physical_details: template.requires_physical_details || false,
          requires_family_details: template.requires_family_details || false,
          requires_document_verification: template.requires_document_verification || false,
          requires_education_preferences: template.requires_education_preferences || false,
          specific_field_requirements: template.specific_field_requirements || {},
          custom_fields: template.custom_fields || []
        });
        toast.success('Template applied successfully');
      }
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const handleSave = async () => {
    try {
      await placementOfficerAPI.createJobRequirements(jobId, requirements);
      toast.success('Job requirements saved successfully');
      if (onRequirementsSaved) {
        onRequirementsSaved(requirements);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save requirements');
    }
  };

  const handleCheckboxChange = (field) => {
    setRequirements(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddCustomField = () => {
    if (!newCustomField.field_name || !newCustomField.field_label) {
      toast.error('Please fill field name and label');
      return;
    }

    setRequirements(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { ...newCustomField }]
    }));

    setNewCustomField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      required: true,
      options: []
    });
  };

  const handleRemoveCustomField = (index) => {
    setRequirements(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }));
  };

  const handleSpecificFieldChange = (fieldName, key, value) => {
    setRequirements(prev => ({
      ...prev,
      specific_field_requirements: {
        ...prev.specific_field_requirements,
        [fieldName]: {
          ...prev.specific_field_requirements[fieldName],
          [key]: value
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Star className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Quick Start: Apply Template</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Save time by using a pre-configured template for common companies
          </p>
          <div className="flex space-x-3">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.template_name} - {template.company_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleApplyTemplate(selectedTemplate)}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Apply Template
            </button>
          </div>
        </div>
      )}

      {/* Basic Requirements */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum CGPA (Optional)
            </label>
            <input
              type="number"
              value={requirements.min_cgpa}
              onChange={(e) => setRequirements({ ...requirements, min_cgpa: e.target.value })}
              step="0.01"
              min="0"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 7.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backlog Policy
            </label>
            <select
              value={requirements.backlog_policy}
              onChange={(e) => {
                const policy = e.target.value;
                if (policy === 'no_restriction') {
                  setRequirements({ ...requirements, backlog_policy: policy, max_backlogs: '', allowed_backlog_semesters: [] });
                } else if (policy === 'no_backlogs') {
                  setRequirements({ ...requirements, backlog_policy: policy, max_backlogs: '0', allowed_backlog_semesters: [] });
                } else {
                  setRequirements({ ...requirements, backlog_policy: policy, max_backlogs: requirements.max_backlogs || '1', allowed_backlog_semesters: [] });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="no_restriction">No Restriction</option>
              <option value="no_backlogs">No Backlogs (Strict)</option>
              <option value="limited">Allow Limited Backlogs</option>
            </select>
          </div>
        </div>
        {requirements.backlog_policy === 'limited' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Backlogs Allowed
              </label>
              <select
                value={requirements.max_backlogs}
                onChange={(e) => setRequirements({ ...requirements, max_backlogs: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={String(num)}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Backlog Semesters <span className="text-xs font-normal text-gray-500">(leave all unchecked = any semester allowed)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map(sem => (
                  <label key={sem} className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={requirements.allowed_backlog_semesters.includes(sem)}
                      onChange={() => {
                        const current = requirements.allowed_backlog_semesters;
                        const updated = current.includes(sem) ? current.filter(s => s !== sem) : [...current, sem].sort((a, b) => a - b);
                        setRequirements({ ...requirements, allowed_backlog_semesters: updated });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Sem {sem}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
        </div>
      </div>

      {/* Extended Profile Requirements */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Extended Profile Requirements</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info />
            <span>Select sections students must complete</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={requirements.requires_academic_extended}
              onChange={() => handleCheckboxChange('requires_academic_extended')}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-800">Academic Extended</div>
              <div className="text-sm text-gray-600">SSLC and 12th marks, year, board</div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={requirements.requires_physical_details}
              onChange={() => handleCheckboxChange('requires_physical_details')}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-800">Physical Details</div>
              <div className="text-sm text-gray-600">Height, weight, disability status</div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={requirements.requires_family_details}
              onChange={() => handleCheckboxChange('requires_family_details')}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-800">Family Details</div>
              <div className="text-sm text-gray-600">Parents' names, occupation, income, siblings</div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={requirements.requires_document_verification}
              onChange={() => handleCheckboxChange('requires_document_verification')}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-800">Document Verification</div>
              <div className="text-sm text-gray-600">PAN, Aadhar, Passport details</div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={requirements.requires_education_preferences}
              onChange={() => handleCheckboxChange('requires_education_preferences')}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-800">Education Preferences</div>
              <div className="text-sm text-gray-600">Interest in B.Tech, M.Tech, study mode</div>
            </div>
          </label>
        </div>
      </div>

      {/* Advanced Configuration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-800">Advanced Configuration</h3>
          <span className="text-sm text-blue-600">
            {showAdvanced ? 'Hide' : 'Show'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-6">
            {/* Specific Field Requirements */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Specific Field Requirements</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Height (cm)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={requirements.specific_field_requirements.height_cm?.min || ''}
                      onChange={(e) => handleSpecificFieldChange('height_cm', 'min', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="155"
                      min="0"
                      max="250"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={requirements.specific_field_requirements.weight_kg?.min || ''}
                      onChange={(e) => handleSpecificFieldChange('weight_kg', 'min', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="45"
                      min="0"
                      max="200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum SSLC %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={requirements.specific_field_requirements.sslc_marks?.min || ''}
                      onChange={(e) => handleSpecificFieldChange('sslc_marks', 'min', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="60"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Custom Company-Specific Fields</h4>

              {/* Existing Custom Fields */}
              {requirements.custom_fields.length > 0 && (
                <div className="mb-4 space-y-2">
                  {requirements.custom_fields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-800">{field.field_label}</div>
                        <div className="text-sm text-gray-600">
                          Type: {field.field_type} | {field.required ? 'Required' : 'Optional'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Custom Field */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Name (for database)
                    </label>
                    <input
                      type="text"
                      value={newCustomField.field_name}
                      onChange={(e) => setNewCustomField({ ...newCustomField, field_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="sitttr_applied"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Label (shown to students)
                    </label>
                    <input
                      type="text"
                      value={newCustomField.field_label}
                      onChange={(e) => setNewCustomField({ ...newCustomField, field_label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Have you applied for SITTTR?"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Type
                    </label>
                    <select
                      value={newCustomField.field_type}
                      onChange={(e) => setNewCustomField({ ...newCustomField, field_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Yes/No</option>
                      <option value="select">Dropdown</option>
                      <option value="textarea">Long Text</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCustomField.required}
                        onChange={(e) => setNewCustomField({ ...newCustomField, required: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Required Field</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus />
                  <span>Add Custom Field</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {jobId && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Job Requirements
          </button>
        </div>
      )}
    </div>
  );
};

export default JobRequirementsConfig;
