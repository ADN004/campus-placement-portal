import { Lightbulb, GraduationCap, CheckCircle, Loader } from 'lucide-react';

const EducationPreferencesSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
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
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-3 shadow-lg">
              <Lightbulb className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Education Preferences</h2>
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
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-2.5 shadow-lg">
            <Lightbulb className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Education Preferences</h3>
        </div>
      )}

      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border-2 border-yellow-100 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-2 mr-3">
            <GraduationCap size={20} className="text-white" />
          </div>
          Higher Education Interest
        </h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-4 cursor-pointer bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-yellow-300 transition-all">
            <input
              type="checkbox"
              name="interested_in_btech"
              checked={formData.interested_in_btech}
              onChange={handleChange}
              className="w-6 h-6 text-yellow-600 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-yellow-100"
            />
            <span className="text-base font-bold text-gray-800 flex-1">
              Interested in B.Tech
            </span>
            {formData.interested_in_btech && (
              <div className="bg-green-500 rounded-full p-1.5">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
          <label className="flex items-center space-x-4 cursor-pointer bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all">
            <input
              type="checkbox"
              name="interested_in_mtech"
              checked={formData.interested_in_mtech}
              onChange={handleChange}
              className="w-6 h-6 text-orange-600 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-orange-100"
            />
            <span className="text-base font-bold text-gray-800 flex-1">
              Interested in M.Tech
            </span>
            {formData.interested_in_mtech && (
              <div className="bg-green-500 rounded-full p-1.5">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
          <label className="flex items-center space-x-4 cursor-pointer bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 transition-all">
            <input
              type="checkbox"
              name="not_interested_in_higher_education"
              checked={formData.not_interested_in_higher_education}
              onChange={handleChange}
              className="w-6 h-6 text-red-600 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-red-100"
            />
            <span className="text-base font-bold text-gray-800 flex-1">
              Not Interested in Higher Education
            </span>
            {formData.not_interested_in_higher_education && (
              <div className="bg-green-500 rounded-full p-1.5">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
        </div>
      </div>

      {(formData.interested_in_btech || formData.interested_in_mtech) && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-100 mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Preferred Study Mode
          </label>
          <select
            name="preferred_study_mode"
            value={formData.preferred_study_mode}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
          >
            <option value="">Select Study Mode</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="distance">Distance Education</option>
          </select>
        </div>
      )}

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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Education Preferences'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EducationPreferencesSection;
