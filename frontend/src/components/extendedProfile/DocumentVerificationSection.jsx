import { FileText, CheckCircle, Loader } from 'lucide-react';

const DocumentVerificationSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const documents = [
    { name: 'has_driving_license', label: 'I have a Driving License', gradient: 'from-blue-500 to-cyan-600' },
    { name: 'has_pan_card', label: 'I have a PAN Card', gradient: 'from-purple-500 to-pink-600' },
    { name: 'has_aadhar_card', label: 'I have an Aadhar Card', gradient: 'from-green-500 to-emerald-600' },
    { name: 'has_passport', label: 'I have a Passport', gradient: 'from-orange-500 to-red-600' }
  ];

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-spc-teal-soft rounded-spc-sm p-2.5">
              <FileText className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Document Verification</h2>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-2 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-spc-xs font-bold px-3 py-1.5">
              <CheckCircle className="mr-2" size={20} />
              Completed
            </span>
          )}
        </div>
      )}

      {mode === 'compact' && (
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2">
            <FileText className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Document Verification</h3>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {documents.map((doc, index) => (
          <div key={doc.name} className="rounded-spc bg-spc-surface border border-spc-line p-4">
            <label className="flex items-center space-x-4 cursor-pointer">
              <input
                type="checkbox"
                name={doc.name}
                checked={formData[doc.name]}
                onChange={handleChange}
                className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal flex-shrink-0"
              />
              <div className="flex items-center space-x-3 flex-1">
                <div className="bg-spc-teal-soft rounded-spc-sm p-2">
                  <FileText size={20} className="text-spc-teal" />
                </div>
                <span className="text-spc-sm font-semibold text-spc-ink">
                  {doc.label}
                </span>
              </div>
              {formData[doc.name] && (
                <div className="bg-spc-ok rounded-full p-1">
                  <CheckCircle className="text-white" size={18} />
                </div>
              )}
            </label>
          </div>
        ))}
      </div>

      {mode === 'full' && onSave && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-spc-sm text-spc-sm font-bold transition-opacity ${
              saving
                ? 'bg-spc-muted text-white cursor-not-allowed'
                : 'bg-spc-teal text-spc-on-teal hover:opacity-95'
            }`}
          >
            {saving ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                {isCompleted && <CheckCircle size={20} />}
                <span>{isCompleted ? 'Update Saved Data' : 'Save Document Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentVerificationSection;
