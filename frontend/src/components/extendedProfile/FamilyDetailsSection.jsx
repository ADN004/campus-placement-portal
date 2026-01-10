import { Users, User, CheckCircle, Loader } from 'lucide-react';

const FamilyDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-3 shadow-lg">
              <Users className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Family Details</h2>
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
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2.5 shadow-lg">
            <Users className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Family Details</h3>
        </div>
      )}

      {/* Father Details */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border-2 border-blue-100 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-2 mr-3">
            <User size={20} className="text-white" />
          </div>
          Father's Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              name="father_name"
              value={formData.father_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Occupation
            </label>
            <input
              type="text"
              name="father_occupation"
              value={formData.father_occupation}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Annual Income (₹)
            </label>
            <input
              type="number"
              name="father_annual_income"
              value={formData.father_annual_income}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="500000"
            />
          </div>
        </div>
      </div>

      {/* Mother Details */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2 mr-3">
            <User size={20} className="text-white" />
          </div>
          Mother's Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              name="mother_name"
              value={formData.mother_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium bg-white"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Occupation
            </label>
            <input
              type="text"
              name="mother_occupation"
              value={formData.mother_occupation}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium bg-white"
              placeholder="Teacher"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Annual Income (₹)
            </label>
            <input
              type="number"
              name="mother_annual_income"
              value={formData.mother_annual_income}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium bg-white"
              placeholder="400000"
            />
          </div>
        </div>
      </div>

      {/* Siblings */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2 mr-3">
            <Users size={20} className="text-white" />
          </div>
          Siblings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Number of Siblings
            </label>
            <input
              type="number"
              name="siblings_count"
              value={formData.siblings_count}
              onChange={handleChange}
              min="0"
              max="10"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Siblings Details
            </label>
            <input
              type="text"
              name="siblings_details"
              value={formData.siblings_details}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
              placeholder="1 brother (engineer), 1 sister (doctor)"
            />
          </div>
        </div>
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Family Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyDetailsSection;
