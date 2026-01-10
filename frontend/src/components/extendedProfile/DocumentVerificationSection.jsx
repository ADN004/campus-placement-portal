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
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3 shadow-lg">
              <FileText className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Document Verification</h2>
          </div>
          {isCompleted && (
            <span className="flex items-center bg-green-100 text-green-800 font-bold px-5 py-2.5 rounded-xl border-2 border-green-200">
              <CheckCircle className="mr-2" size={20} />
              Completed
            </span>
          )}
        </div>
      )}

      {mode === 'compact' && (
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2.5 shadow-lg">
            <FileText className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Document Verification</h3>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {documents.map((doc, index) => (
          <div key={doc.name} className={`bg-gradient-to-br ${
            index === 0 ? 'from-blue-50 to-cyan-50 border-blue-100' :
            index === 1 ? 'from-purple-50 to-pink-50 border-purple-100' :
            index === 2 ? 'from-green-50 to-emerald-50 border-green-100' :
            'from-orange-50 to-red-50 border-orange-100'
          } border-2 rounded-2xl p-5`}>
            <label className="flex items-center space-x-4 cursor-pointer">
              <input
                type="checkbox"
                name={doc.name}
                checked={formData[doc.name]}
                onChange={handleChange}
                className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100"
              />
              <div className="flex items-center space-x-3 flex-1">
                <div className={`bg-gradient-to-br ${doc.gradient} rounded-lg p-2`}>
                  <FileText size={20} className="text-white" />
                </div>
                <span className="text-base font-bold text-gray-800">
                  {doc.label}
                </span>
              </div>
              {formData[doc.name] && (
                <div className="bg-green-500 rounded-full p-1.5">
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
            className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center space-x-2 ${
              saving ? 'bg-gray-400 cursor-not-allowed' :
              isCompleted
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
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
