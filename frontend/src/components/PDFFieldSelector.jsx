import React, { useState } from 'react';
import { FileText, X, Check } from 'lucide-react';

const PDFFieldSelector = ({ onExport, onClose, applicantCount, exportType = 'enhanced' }) => {
  const [selectedFields, setSelectedFields] = useState([
    'prn',
    'student_name',
    'branch',
    'cgpa',
    'application_status'
  ]);

  const availableFields = [
    { key: 'prn', label: 'PRN' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'branch', label: 'Branch' },
    { key: 'cgpa', label: 'CGPA' },
    { key: 'backlog_count', label: 'Backlogs' },
    { key: 'application_status', label: 'Status' },
    { key: 'date_of_birth', label: 'DOB' },
    { key: 'gender', label: 'Gender' },
    { key: 'sslc_marks', label: 'SSLC %' },
    { key: 'twelfth_marks', label: '12th %' },
    { key: 'district', label: 'District' },
    { key: 'has_passport', label: 'Passport' },
    { key: 'has_aadhar_card', label: 'Aadhar' },
    { key: 'has_driving_license', label: 'Driving License' },
    { key: 'has_pan_card', label: 'PAN Card' },
    { key: 'height_cm', label: 'Height (cm)' },
    { key: 'weight_kg', label: 'Weight (kg)' }
  ];

  const toggleField = (fieldKey) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const selectAll = () => {
    setSelectedFields(availableFields.map(f => f.key));
  };

  const selectNone = () => {
    setSelectedFields([]);
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }
    onExport(selectedFields);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${exportType === 'selected_only' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white p-6 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {exportType === 'selected_only' ? <Check size={24} /> : <FileText size={24} />}
            <div>
              <h2 className="text-xl font-bold">
                {exportType === 'selected_only' ? 'Export Selected Students Only' : 'Customize PDF Export'}
              </h2>
              <p className="text-sm opacity-90">
                {exportType === 'selected_only'
                  ? `Select fields to include (${applicantCount} selected student${applicantCount !== 1 ? 's' : ''})`
                  : `Select fields to include (${applicantCount} applicants)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-600">{selectedFields.length}</span> of {availableFields.length} fields selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Field Selection Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableFields.map((field) => (
              <button
                key={field.key}
                onClick={() => toggleField(field.key)}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                  selectedFields.includes(field.key)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-sm">{field.label}</span>
                {selectedFields.includes(field.key) && (
                  <Check size={16} className="text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFields.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FileText size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFFieldSelector;
