import { User, CheckCircle, Loader } from 'lucide-react';

const PersonalDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const districts = [
    'Thiruvananthapuram', 'Kollam', 'Alappuzha', 'Pathanamthitta', 'Kottayam',
    'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
    'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-3 shadow-lg">
              <User className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Personal Details</h2>
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
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-2.5 shadow-lg">
            <User className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Personal Details</h3>
        </div>
      )}

      <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl border-2 border-orange-100 mb-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all font-medium bg-white"
            >
              <option value="">Select District</option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Permanent Address
            </label>
            <textarea
              name="permanent_address"
              value={formData.permanent_address}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all font-medium bg-white"
              placeholder="Enter your complete address..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Interests & Hobbies
            </label>
            <textarea
              name="interests_hobbies"
              value={formData.interests_hobbies}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all font-medium bg-white"
              placeholder="e.g., Reading, Coding, Sports, Music..."
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Personal Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalDetailsSection;
