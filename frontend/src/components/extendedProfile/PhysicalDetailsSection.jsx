import { Activity, CheckCircle, Loader } from 'lucide-react';

const PhysicalDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 shadow-lg">
              <Activity className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Physical Details</h2>
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
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 shadow-lg">
            <Activity className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Physical Details</h3>
        </div>
      )}

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Height (cm)
            </label>
            <input
              type="number"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              min="100"
              max="250"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all font-medium bg-white"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              min="30"
              max="200"
              step="0.1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all font-medium bg-white"
              placeholder="65.5"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100 mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            name="physically_handicapped"
            checked={formData.physically_handicapped}
            onChange={handleChange}
            className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100"
          />
          <span className="text-base font-bold text-gray-800">
            I have a physical disability
          </span>
        </label>

        {formData.physically_handicapped && (
          <div className="mt-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Disability Details
            </label>
            <textarea
              name="handicap_details"
              value={formData.handicap_details}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="Please describe your disability..."
            />
          </div>
        )}
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Physical Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhysicalDetailsSection;
