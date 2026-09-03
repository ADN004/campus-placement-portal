import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import TemplatesBody from './templates/TemplatesBody';
import TemplatesSkeleton from './templates/TemplatesSkeleton';
import TemplateForm from './templates/TemplateForm';
import TemplateView from './templates/TemplateView';

/**
 * Requirement templates — container.
 *
 * All the state and every call to the server; the body and the two dialogs draw
 * them. The form keeps its own half-filled values, because those belong to the
 * open dialog rather than to the page, and hands back a finished payload.
 */
export default function ManageRequirementTemplates() {
  const deviceType = useDeviceType();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [showFormModal, setShowFormModal] = useState(false);
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

  /*
   * Create and edit were two booleans that opened the same dialog, and the
   * dialog told them apart by whether `selectedTemplate` was null. One flag now:
   * create clears the selection, edit sets it.
   */
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowFormModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowFormModal(true);
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setSelectedTemplate(null);
  };

  /** Called by the form with a finished payload. Errors are shown, not thrown. */
  const handleSubmit = async (payload, isEdit) => {
    try {
      if (isEdit) {
        await superAdminAPI.updateRequirementTemplate(selectedTemplate.id, payload);
        toast.success('Template updated successfully');
      } else {
        await superAdminAPI.createRequirementTemplate(payload);
        toast.success('Template created successfully');
      }
      setShowFormModal(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} template`);
      console.error(error);
    }
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

  if (showSkeleton) return <TemplatesSkeleton layout={deviceType} />;

  return (
    <>
      <TemplatesBody
        layout={deviceType}
        templates={templates}
        onCreate={handleCreateTemplate}
        onView={handleViewTemplate}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
      />

      {showFormModal && (
        <TemplateForm
          template={selectedTemplate}
          onSave={handleSubmit}
          onClose={closeForm}
        />
      )}

      {showViewModal && selectedTemplate && (
        <TemplateView
          template={selectedTemplate}
          onEdit={() => {
            setShowViewModal(false);
            handleEditTemplate(selectedTemplate);
          }}
          onClose={() => { setShowViewModal(false); setSelectedTemplate(null); }}
        />
      )}
    </>
  );
}
