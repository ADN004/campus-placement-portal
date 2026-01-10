import { GraduationCap, CheckCircle, Loader } from 'lucide-react';

const AcademicExtendedSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-3 shadow-lg">
              <GraduationCap className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Academic Extended Details</h2>
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
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-2.5 shadow-lg">
            <GraduationCap className="text-white" size={22} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Academic Extended Details</h3>
        </div>
      )}

      {/* SSLC Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border-2 border-blue-100 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-2 mr-3">
            <GraduationCap size={20} className="text-white" />
          </div>
          SSLC Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              SSLC Marks (%)
            </label>
            <input
              type="number"
              name="sslc_marks"
              value={formData.sslc_marks}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="85.5"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              SSLC Year
            </label>
            <input
              type="number"
              name="sslc_year"
              value={formData.sslc_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="2020"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Board
            </label>
            <input
              type="text"
              name="sslc_board"
              value={formData.sslc_board}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              placeholder="CBSE"
            />
          </div>
        </div>
      </div>

      {/* 12th Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2 mr-3">
            <GraduationCap size={20} className="text-white" />
          </div>
          12th Details
        </h3>
        <p className="text-sm text-gray-600 font-medium mb-5 ml-11">Optional - If applicable</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              12th Marks (%)
            </label>
            <input
              type="number"
              name="twelfth_marks"
              value={formData.twelfth_marks}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
              placeholder="82.0"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              12th Year
            </label>
            <input
              type="number"
              name="twelfth_year"
              value={formData.twelfth_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
              placeholder="2022"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Board
            </label>
            <input
              type="text"
              name="twelfth_board"
              value={formData.twelfth_board}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium bg-white"
              placeholder="State Board"
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Academic Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AcademicExtendedSection;
