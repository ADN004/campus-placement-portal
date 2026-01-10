import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  CheckCircle,
  XCircle,
  FileText,
  Settings,
  Copy,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import KERALA_POLYTECHNIC_BRANCHES from '../../constants/branches';

export default function ManageRequirementTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getRequirementTemplates();
      setTemplates(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      return;
    }

    try {
      await superAdminAPI.deleteRequirementTemplate(templateId);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
      console.error(error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Settings className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Requirement Templates
              </h1>
              <p className="text-purple-100 text-lg">
                Manage company-specific requirement templates
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg text-center py-16 px-8">
          <Briefcase className="mx-auto mb-4 text-gray-300" size={64} />
          <p className="text-gray-600 text-xl mb-6 font-semibold">No templates created yet</p>
          <button onClick={handleCreateTemplate} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onView={handleViewTemplate}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedTemplate(null);
            fetchTemplates();
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedTemplate && (
        <TemplateViewModal
          template={selectedTemplate}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTemplate(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            handleEditTemplate(selectedTemplate);
          }}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, onEdit, onDelete, onView }) {
  const allowedBranches = template.allowed_branches
    ? (typeof template.allowed_branches === 'string'
        ? JSON.parse(template.allowed_branches)
        : template.allowed_branches)
    : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Briefcase className="text-white" size={20} />
          </div>
          <h3 className="font-bold text-lg text-gray-900">{template.template_name}</h3>
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
      )}

      {/* Requirements Summary */}
      <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Min CGPA:</span>
          <span className="font-semibold">{template.min_cgpa || 'N/A'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Max Backlogs:</span>
          <span className="font-semibold">{template.max_backlogs ?? 'N/A'}</span>
        </div>
        {allowedBranches.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Branches:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {allowedBranches.slice(0, 3).map((branch, index) => (
                <span key={index} className="badge badge-info text-xs">
                  {branch}
                </span>
              ))}
              {allowedBranches.length > 3 && (
                <span className="badge badge-info text-xs">
                  +{allowedBranches.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extended Profile Requirements */}
      <div className="flex flex-wrap gap-2 mb-4">
        {template.requires_academic_extended && (
          <span className="badge bg-purple-100 text-purple-800 text-xs">Academic</span>
        )}
        {template.requires_physical_details && (
          <span className="badge bg-green-100 text-green-800 text-xs">Physical</span>
        )}
        {template.requires_family_details && (
          <span className="badge bg-blue-100 text-blue-800 text-xs">Family</span>
        )}
        {template.requires_document_verification && (
          <span className="badge bg-yellow-100 text-yellow-800 text-xs">Documents</span>
        )}
        {template.requires_education_preferences && (
          <span className="badge bg-pink-100 text-pink-800 text-xs">Education</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onView(template)}
          className="btn btn-secondary flex-1 flex items-center justify-center space-x-1 text-sm"
        >
          <Eye size={16} />
          <span>View</span>
        </button>
        <button
          onClick={() => onEdit(template)}
          className="btn btn-secondary flex-1 flex items-center justify-center space-x-1 text-sm"
        >
          <Edit size={16} />
          <span>Edit</span>
        </button>
        <button
          onClick={() => onDelete(template.id, template.template_name)}
          className="btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// Template Form Modal Component
function TemplateFormModal({ template, onClose, onSuccess }) {
  const isEdit = !!template;
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    min_cgpa: template?.min_cgpa || '',
    max_backlogs: template?.max_backlogs ?? '',
    allowed_branches: template?.allowed_branches
      ? (typeof template.allowed_branches === 'string'
          ? JSON.parse(template.allowed_branches)
          : template.allowed_branches)
      : [],
    requires_academic_extended: template?.requires_academic_extended || false,
    requires_physical_details: template?.requires_physical_details || false,
    requires_family_details: template?.requires_family_details || false,
    requires_personal_details: template?.requires_personal_details || false,
    requires_document_verification: template?.requires_document_verification || false,
    requires_education_preferences: template?.requires_education_preferences || false,
  });
  const [submitting, setSubmitting] = useState(false);

  const branchOptions = KERALA_POLYTECHNIC_BRANCHES;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        allowed_branches: formData.allowed_branches,
        min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : null,
        max_backlogs: formData.max_backlogs !== '' ? parseInt(formData.max_backlogs) : null,
      };

      if (isEdit) {
        await superAdminAPI.updateRequirementTemplate(template.id, payload);
        toast.success('Template updated successfully');
      } else {
        await superAdminAPI.createRequirementTemplate(payload);
        toast.success('Template created successfully');
      }

      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} template`);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBranch = (branch) => {
    setFormData(prev => ({
      ...prev,
      allowed_branches: prev.allowed_branches.includes(branch)
        ? prev.allowed_branches.filter(b => b !== branch)
        : [...prev.allowed_branches, branch]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.template_name}
              onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
              placeholder="e.g., Thoughtworks STEP Program"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template..."
              rows="3"
              className="input"
            />
          </div>

          {/* Basic Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum CGPA
              </label>
              <input
                type="number"
                value={formData.min_cgpa}
                onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                placeholder="e.g., 7.0"
                min="0"
                max="10"
                step="0.01"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Backlogs
              </label>
              <input
                type="number"
                value={formData.max_backlogs}
                onChange={(e) => setFormData({ ...formData, max_backlogs: e.target.value })}
                placeholder="e.g., 0"
                min="0"
                className="input"
              />
            </div>
          </div>

          {/* Allowed Branches */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Branches
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {branchOptions.map((branch) => (
                <label
                  key={branch}
                  className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                    formData.allowed_branches.includes(branch)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_branches.includes(branch)}
                    onChange={() => toggleBranch(branch)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{branch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Extended Profile Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Extended Profile Sections
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_academic_extended}
                  onChange={(e) => setFormData({ ...formData, requires_academic_extended: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Academic Extended (SSLC, 12th details)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_physical_details}
                  onChange={(e) => setFormData({ ...formData, requires_physical_details: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Physical Details (Height, Weight, Disability)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_family_details}
                  onChange={(e) => setFormData({ ...formData, requires_family_details: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Family Details (Parents, Siblings)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_personal_details}
                  onChange={(e) => setFormData({ ...formData, requires_personal_details: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Personal Details (District, Address, Interests)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_document_verification}
                  onChange={(e) => setFormData({ ...formData, requires_document_verification: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Document Verification (PAN, Aadhar, Passport)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.requires_education_preferences}
                  onChange={(e) => setFormData({ ...formData, requires_education_preferences: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Education Preferences (B.Tech, M.Tech interest)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Template View Modal Component
function TemplateViewModal({ template, onClose, onEdit }) {
  const allowedBranches = template.allowed_branches
    ? (typeof template.allowed_branches === 'string'
        ? JSON.parse(template.allowed_branches)
        : template.allowed_branches)
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{template.template_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {template.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{template.description}</p>
            </div>
          )}

          {/* Basic Requirements */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Basic Requirements</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">Minimum CGPA:</span>
                <p className="font-semibold text-lg">{template.min_cgpa || 'No minimum'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Maximum Backlogs:</span>
                <p className="font-semibold text-lg">
                  {template.max_backlogs !== null && template.max_backlogs !== undefined
                    ? template.max_backlogs
                    : 'No limit'}
                </p>
              </div>
            </div>
          </div>

          {/* Allowed Branches */}
          {allowedBranches.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Allowed Branches</h3>
              <div className="flex flex-wrap gap-2">
                {allowedBranches.map((branch, index) => (
                  <span key={index} className="badge badge-info">
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extended Profile Requirements */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Extended Profile Requirements</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {template.requires_academic_extended ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Academic Extended</span>
              </div>
              <div className="flex items-center space-x-2">
                {template.requires_physical_details ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Physical Details</span>
              </div>
              <div className="flex items-center space-x-2">
                {template.requires_family_details ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Family Details</span>
              </div>
              <div className="flex items-center space-x-2">
                {template.requires_personal_details ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Personal Details</span>
              </div>
              <div className="flex items-center space-x-2">
                {template.requires_document_verification ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Document Verification</span>
              </div>
              <div className="flex items-center space-x-2">
                {template.requires_education_preferences ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className="text-sm">Education Preferences</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <button onClick={onEdit} className="btn btn-primary flex-1">
              Edit Template
            </button>
            <button onClick={onClose} className="btn btn-secondary flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
